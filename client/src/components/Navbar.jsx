import React, { useState } from 'react';
import { useLocation, Link } from "react-router-dom";
import { HashLink } from "react-router-hash-link";
import { Button } from "./ui/button";
import Logo from "./Logo";

const Navbar = () => {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (path) => {
    if (!path.startsWith('#')) {
      return location.pathname === path;
    }
    return (location.pathname === '/' && location.hash === path) || (location.pathname === path.substring(1));
  };

  const closeMenuAndScroll = () => {
    setMenuOpen(false);
  };

  return (
    <>
      <nav className="md:fixed top-0 left-0 right-0 z-50 px-6 py-6 backdrop-blur-md border-b border-border/60 sm:px-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          
          <Logo />
          <div className="hidden md:flex items-center gap-1 text-white border-2 border-[#EFBF04] rounded-full px-4 py-2">
            <HashLink
              to="/"
              className={`px-4 py-2 rounded-full text-sm transition ${
                isActive('/')
                  ? "bg-white text-black"
                  : "text-white/80 hover:text-white hover:bg-white/10"
              }`}>
              Home </HashLink>
            <HashLink
              to="/#features"
              className={`px-4 py-2 rounded-full text-sm transition ${
                isActive('/features')
                  ? "bg-white text-black"
                  : "text-white/80 hover:text-white hover:bg-white/10"
              }`}> Features </HashLink>
            <HashLink
              to="/chat"
              className={`px-4 py-2 rounded-full text-sm transition ${
                isActive('/chat')
                  ? "bg-white text-black"
                  : "text-white/80 hover:text-white hover:bg-white/10"
              }`}> Chat </HashLink>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link to="/sign-up">
              <Button className="bg-[#2323FF] hover:bg-[#2323FF]/80 text-white rounded-full w-24 py-5">
                Sign Up
              </Button>
            </Link>
            <Link to="/sign-in">
              <Button className="bg-primary hover:bg-primary/80 text-white rounded-full w-24 py-5">
                Log In
              </Button>
            </Link>
          </div>

          <button
            className="md:hidden size-10"
            onClick={() => setMenuOpen(true)}>
            <img src="/menu_icon.svg" alt="" />
          </button>
        </div>
      </nav>

      <div
        className={`fixed inset-0 z-100 bg-black/80 backdrop-blur-xl flex flex-col items-center justify-center gap-10 
        transition-all duration-500 ease-out
        ${menuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`} >
        <button
          className="absolute top-8 right-8 text-white text-4xl"
          onClick={() => setMenuOpen(false)} >
          ✕
        </button>
        <HashLink
          to="/"
          onClick={() => setMenuOpen(false)}
          className="text-white text-2xl font-semibold tracking-wide hover:text-[#EFBF04] transition-all" >
          Home
        </HashLink>
        <HashLink
          to="/#features"
          onClick={() => setMenuOpen(false)}
          className="text-white text-2xl font-semibold tracking-wide hover:text-[#EFBF04] transition-all" >
          Features
        </HashLink>

        <HashLink
          to="/chat"
          onClick={() => setMenuOpen(false)}
          className="text-white text-2xl font-semibold tracking-wide hover:text-[#EFBF04] transition-all"
        >
          Chat
        </HashLink>

        <Link to="/sign-up" onClick={() => setMenuOpen(false)}>
          <Button
            className="bg-[#2323FF] hover:bg-[#2323FF]/80 w-48 py-4 rounded-full text-lg" >
            Sign Up
          </Button>
        </Link>
        <Link to="/sign-in" onClick={() => setMenuOpen(false)}>
          <Button
            className="bg-primary hover:bg-primary/80 w-48 py-4 rounded-full text-lg" >
            Log In
          </Button>
        </Link>
      </div>
    </>
  );
};

export default Navbar;