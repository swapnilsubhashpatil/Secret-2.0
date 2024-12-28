import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  Typography,
  IconButton,
  Box,
  styled,
  TextField,
  Button,
} from "@mui/material";
import { Edit, Delete, Save, Close, Add } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import Nav from "./Nav";
import EmptyState from "./EmptyState";
import { secrets, auth } from "./api";

const ClippedCard = styled(Card)(({ theme }) => ({
  position: "relative",
  background: "#3E5879",
  clipPath:
    "polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)",
  border: "1px hidden",
  marginBottom: theme.spacing(3),
  "&::before": {
    content: '""',
    position: "absolute",
    top: 4,
    left: 4,
    right: 4,
    bottom: 4,
    background: "#F0F4F9",
    clipPath:
      "polygon(0 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%)",
    zIndex: 0,
  },
  "&:hover": {
    transform: "translateX(5px)",
    "&::after": {
      transform: "translateX(-10px)",
      opacity: 1,
    },
  },
  "&::after": {
    content: '""',
    position: "absolute",
    top: 0,
    left: -5,
    right: 5,
    bottom: 0,
    background: "linear-gradient(to right, #4B83EF, #ff0080)",
    clipPath:
      "polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)",
    zIndex: -1,
    opacity: 0,
    transition: "all 0.3s ease",
  },
}));

const ModernInput = styled("input")({
  background: "#F5EFFF",
  border: "none",
  color: "#213555",
  padding: "8px 12px",
  borderRadius: "4px",
  width: "100%",
  "&:focus": {
    outline: "1px solid #685752",
    background: "#F5EFFF",
  },
});

const AddCard = styled(Card)(({ theme }) => ({
  background: "#F0F4F9",
  marginBottom: theme.spacing(3),
  padding: theme.spacing(2),
  border: "2px dashed #3E5879",
}));

const SecretPage = () => {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [items, setItems] = useState([]);
  const [newSecret, setNewSecret] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Authentication check with cleanup
  useEffect(() => {
    let mounted = true;

    const checkAuth = async () => {
      try {
        if (mounted) {
          await auth.checkAuth();
          setIsLoading(false);
        }
      } catch (error) {
        if (mounted && !window.location.pathname.includes("/login")) {
          navigate("/login", { replace: true });
        }
      }
    };

    checkAuth();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  // Fetch secrets with cleanup
  useEffect(() => {
    let mounted = true;

    const fetchSecrets = async () => {
      try {
        if (mounted) {
          const secretsData = await secrets.getAll();
          setItems(
            secretsData.map((secret) => ({
              id: secret.secret_id,
              title: secret.secret,
              editing: false,
            }))
          );
          setError("");
        }
      } catch (err) {
        if (mounted) {
          setError("Error fetching secrets. Please try again.");
        }
      }
    };

    fetchSecrets();

    return () => {
      mounted = false;
    };
  }, []);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  const handleAddSecret = async () => {
    if (!newSecret.trim()) return;

    try {
      const response = await secrets.add(newSecret);
      setItems([
        ...items,
        {
          id: response.secret_id,
          title: newSecret,
          editing: false,
        },
      ]);
      setNewSecret("");
      setError("");
    } catch (err) {
      setError("Error adding secret. Please try again.");
    }
  };

  const handleEdit = (id) => {
    setItems(
      items.map((item) => (item.id === id ? { ...item, editing: true } : item))
    );
  };

  const handleSave = async (id, newTitle) => {
    try {
      await secrets.update(id, newTitle);
      setItems(
        items.map((item) =>
          item.id === id ? { ...item, title: newTitle, editing: false } : item
        )
      );
      setError("");
    } catch (err) {
      setError("Error updating secret. Please try again.");
    }
  };

  const handleCancel = (id) => {
    setItems(
      items.map((item) => (item.id === id ? { ...item, editing: false } : item))
    );
  };

  const handleDelete = async (id) => {
    try {
      await secrets.delete(id);
      setItems(items.filter((item) => item.id !== id));
      setError("");
    } catch (err) {
      setError("Error deleting secret. Please try again.");
    }
  };

  return (
    <div>
      <Nav onSecrets={true} />
      <Box sx={{ maxWidth: 800, mx: "auto", p: 3 }}>
        {error && (
          <Typography color="error" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}

        <AddCard>
          <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Enter a new secret..."
              value={newSecret}
              onChange={(e) => setNewSecret(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter") handleAddSecret();
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  backgroundColor: "white",
                },
              }}
            />
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={handleAddSecret}
              sx={{
                backgroundColor: "#3E5879",
                "&:hover": {
                  backgroundColor: "#4B83EF",
                },
              }}
            >
              Add
            </Button>
          </Box>
        </AddCard>

        {items.length === 0 ? (
          <EmptyState />
        ) : (
          items.map((item) => (
            <ClippedCard key={item.id}>
              <CardContent
                sx={{
                  position: "relative",
                  zIndex: 1,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  p: 3,
                }}
              >
                {item.editing ? (
                  <ModernInput
                    defaultValue={item.title}
                    onKeyDown={(e) => {
                      if (e.key === "Enter")
                        handleSave(item.id, e.target.value);
                      if (e.key === "Escape") handleCancel(item.id);
                    }}
                    autoFocus
                  />
                ) : (
                  <Typography sx={{ color: "#1A1A1A", fontWeight: 600 }}>
                    {item.title}
                  </Typography>
                )}

                <Box sx={{ display: "flex", gap: 1 }}>
                  {item.editing ? (
                    <>
                      <IconButton
                        onClick={() =>
                          handleSave(
                            item.id,
                            document.querySelector("input").value
                          )
                        }
                        sx={{
                          color: "#90caf9",
                          "&:hover": { bgcolor: "rgba(144, 202, 249, 0.08)" },
                        }}
                      >
                        <Save />
                      </IconButton>
                      <IconButton
                        onClick={() => handleCancel(item.id)}
                        sx={{
                          color: "#f48fb1",
                          "&:hover": { bgcolor: "rgba(244, 143, 177, 0.08)" },
                        }}
                      >
                        <Close />
                      </IconButton>
                    </>
                  ) : (
                    <>
                      <IconButton
                        onClick={() => handleEdit(item.id)}
                        sx={{
                          color: "#A7D477",
                          "&:hover": { bgcolor: "#E5D9F2" },
                        }}
                      >
                        <Edit />
                      </IconButton>
                      <IconButton
                        onClick={() => handleDelete(item.id)}
                        sx={{
                          color: "#F72C5B",
                          "&:hover": { bgcolor: "#E5D9F2" },
                        }}
                      >
                        <Delete />
                      </IconButton>
                    </>
                  )}
                </Box>
              </CardContent>
            </ClippedCard>
          ))
        )}
      </Box>
    </div>
  );
};

export default SecretPage;
