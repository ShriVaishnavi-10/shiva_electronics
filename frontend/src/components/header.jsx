import React, { useState } from "react";
import {
  Navbar,
  NavbarBrand,
  Nav,
  NavItem,
  Dropdown,
  DropdownToggle,
  DropdownMenu,
  DropdownItem
} from "reactstrap";
import { FaBell, FaCog, FaUserCircle } from "react-icons/fa";
import "../components";

const Header = () => {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const toggle = () => setDropdownOpen(!dropdownOpen);

  const handleLogout = () => {
    alert("Logged out!");
  };

  return (
    <Navbar className="app-header" expand="md" style={{position:"fixed;"}}>
      <NavbarBrand className="logo">MyApp</NavbarBrand>

      <Nav className="ms-auto align-items-center" navbar>

        <NavItem className="icon-btn">
          <FaBell />
        </NavItem>

        <NavItem className="icon-btn">
          <FaCog />
        </NavItem>

        <Dropdown nav isOpen={dropdownOpen} toggle={toggle}>
          <DropdownToggle nav className="user-dropdown">
            <FaUserCircle className="user-icon" />
            <span className="username"></span>
          </DropdownToggle>

          <DropdownMenu end>
            <DropdownItem header>Account</DropdownItem>
            <DropdownItem>Profile</DropdownItem>
            <DropdownItem divider />
            <DropdownItem onClick={handleLogout}>
              Logout
            </DropdownItem>
          </DropdownMenu>
        </Dropdown>

      </Nav>
    </Navbar>
  );
};

export default Header;
