import React from "react";
// import HighlightIcon from "@mui/icons-material/Highlight";

function Header() {
  return (
    <nav>
      <div className="container">
        <div className="logo">
          <a>Secrets</a>
        </div>
        <div className="button">
          <button>Log Out</button>
        </div>
      </div>
    </nav>
  );
}

export default Header;
