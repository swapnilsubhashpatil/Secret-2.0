import React from "react";
import { TypeAnimation } from "react-type-animation";

function Nav() {
  return (
    <nav>
      <div className="container">
        <div className="logo">
          <a>Secrets</a>
          <div className="tagline">
            <TypeAnimation
              sequence={[
                "Your secrets are safe here.",
                2000, // wait 1s before replacing "Mice" with "Hamsters"
                "Your secrets are locked here.",
                2000,
                "Your secrets are secured here.",
                2000,
                "Your secrets are hidden here.",
                2000,
              ]}
              wrapper="span"
              speed={40}
              repeat={Infinity}
            />
          </div>
        </div>
        <div className="main-tag">
          <TypeAnimation
            sequence={[
              "Your secrets are safe here.",
              2000, // wait 1s before replacing "Mice" with "Hamsters"
              "Your secrets are locked here.",
              2000,
              "Your secrets are secured here.",
              2000,
              "Your secrets are hidden here.",
              2000,
            ]}
            wrapper="span"
            speed={40}
            repeat={Infinity}
          />
        </div>
        <div className="button">
          <button class="contact-btn">Contact Developer</button>
        </div>
      </div>
    </nav>
  );
}

export default Nav;
