import React from 'react';
import styled from 'styled-components';

interface ButtonProps {
  onClick?: React.MouseEventHandler<HTMLButtonElement>
  className?: string
}

const Button: React.FC<ButtonProps> = ({ onClick, className }) => {
  return (
    <StyledWrapper className={className}>
      <button className="button type1" onClick={onClick} aria-label="button" />
    </StyledWrapper>
  );
}

const StyledWrapper = styled.div`
  .button {
    height: 50px;
    width: 150px;
    border: none;
    border-radius: 10px;
    cursor: pointer;
    position: relative;
    overflow: hidden;
    transition: all 0.35s ease-in-out;
    box-shadow: 0 6px 18px rgba(0,0,0,0.12);
  }

  .button:hover {
    box-shadow: 0 12px 30px rgba(0,0,0,0.18);
  }

  .type1::after {
    content: "Sign In";
    height: 50px;
    width: 150px;
    background-color: #1CA74F;
    color: #fff;
    position: absolute;
    top: 0%;
    left: 0%;
    transform: translateY(50px);
    font-size: 1.2rem;
    font-weight: 700;
    font-family: Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial;
    letter-spacing: 0.2px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.5s ease-in-out;
  }

  .type1::before {
    content: "Get Started";
    height: 50px;
    width: 150px;
    background-color: #fff;
    color: #1CA74F;
    position: absolute;
    top: 0%;
    left: 0%;
    transform: translateY(0px) scale(1.2);
    font-size: 1.2rem;
    font-weight: 700;
    font-family: Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial;
    letter-spacing: 0.2px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.5s ease-in-out;
  }

  .type1:hover::after {
    transform: translateY(0) scale(1.2);
  }

  .type1:hover::before {
    transform: translateY(-50px) scale(0) rotate(120deg);
  }`;

export default Button;
