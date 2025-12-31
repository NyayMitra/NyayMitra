import React from 'react'
import { Link } from 'react-router-dom'
import { Scale } from 'lucide-react';
import logo from "/logo.png"

function Logo() {
  return (
    <div>
      <Link to="/" className="">
        <img src={logo} alt="logo" className='h-16'/>
      </Link>
    </div>
  )
}

export default Logo