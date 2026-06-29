import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/clerk-react";
import LandingPage from "./pages/LandingPage";
import ChatPage from "./pages/ChatPage";
import SignInPage from "./pages/SignInPage";
import SignUpPage from "./pages/SignUpPage";

console.log("App routes initialized");

const App = () => (
      <BrowserRouter basename="/">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route 
            path="/chat" 
            element={
              <>
                <SignedIn>
                  <ChatPage />
                </SignedIn>
                <SignedOut>
                  <RedirectToSignIn />
                </SignedOut>
              </>
            } 
          />
           <Route 
            path="/chat/:chatId" 
            element={
              <>
                <SignedIn>
                  <ChatPage />
                </SignedIn>
                <SignedOut>
                  <RedirectToSignIn />
                </SignedOut>
              </>
            } 
          />
          <Route path="/sign-in" element={<SignInPage />} />
          <Route path="/sign-up" element={<SignUpPage />} />
        </Routes>
      </BrowserRouter>
);

export default App;
