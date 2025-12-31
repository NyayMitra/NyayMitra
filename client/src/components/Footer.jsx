import React from 'react';
import { Link } from 'react-router-dom';
import { Scale, Phone, Mail, Facebook, Linkedin, MessageCircle, Send } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-background border-t border-border py-16 px-6 bg-black">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <Scale className="h-6 w-6 text-white" />
              <span className="text-xl font-bold text-white">NYAY MITRA</span>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-[#2323FF] font-semibold">About Us</h3>
              <p className="text-white text-sm leading-relaxed">
                Helping citizens understand their cases and lawyers uncover deeper insights, 
                all powered by the Indian Judicial System.
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-[#2323FF] font-semibold">Contact Us On</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-white">
                  <Phone className="h-4 w-4" />
                  <span className="text-sm">+91 123567890</span>
                </div>
                <div className="flex items-center gap-2 text-white">
                  <Mail className="h-4 w-4" />
                  <span className="text-sm">Nyaymitra2025@gmail.com</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="font-semibold text-[#2323FF]">Information</h3>
            <ul className="space-y-3">
              <li>
                <Link to="/" className="text-white hover:text-foreground transition-smooth text-sm">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/" className="text-white hover:text-foreground transition-smooth text-sm">
                  More Search
                </Link>
              </li>
              <li>
                <Link to="/" className="text-white hover:text-foreground transition-smooth text-sm">
                  Blog
                </Link>
              </li>
              <li>
                <Link to="/" className="text-white hover:text-foreground transition-smooth text-sm">
                  Testimonial
                </Link>
              </li>
              <li>
                <Link to="/" className="text-white hover:text-foreground transition-smooth text-sm">
                  Events
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-6">
            <h3 className="text-[#2323FF] font-semibold">Helpful Links</h3>
            <ul className="space-y-3">
              <li>
                <Link to="/" className="text-white hover:text-foreground transition-smooth text-sm">
                  Services
                </Link>
              </li>
              <li>
                <Link to="/" className="text-white hover:text-foreground transition-smooth text-sm">
                  Supports
                </Link>
              </li>
              <li>
                <Link to="/" className="text-white hover:text-foreground transition-smooth text-sm">
                  Terms and conditions
                </Link>
              </li>
              <li>
                <Link to="/" className="text-white hover:text-foreground transition-smooth text-sm">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-6">
            <h3 className="text-[#2323FF] font-semibold">Follow Us</h3>
            <div className="flex gap-4">
              <Link to="#" className="w-10 h-10 bg-primary hover:bg-primary/80 rounded-full flex items-center justify-center transition-smooth group">
                <Facebook className="h-5 w-5 text-primary-foreground group-hover:scale-110 transition-transform" />
              </Link>
              <Link to="#" className="w-10 h-10 bg-primary hover:bg-primary/80 rounded-full flex items-center justify-center transition-smooth group">
                <Linkedin className="h-5 w-5 text-primary-foreground group-hover:scale-110 transition-transform" />
              </Link>
              <Link to="#" className="w-10 h-10 bg-primary hover:bg-primary/80 rounded-full flex items-center justify-center transition-smooth group">
                <MessageCircle className="h-5 w-5 text-primary-foreground group-hover:scale-110 transition-transform" />
              </Link>
              <Link to="#" className="w-10 h-10 bg-primary hover:bg-primary/80 rounded-full flex items-center justify-center transition-smooth group">
                <Send className="h-5 w-5 text-primary-foreground group-hover:scale-110 transition-transform" />
              </Link>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-border text-center">
          <p className="text-white text-sm">
            © 2025 Nyay Mitra. All rights reserved. | Friend of Justice
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;