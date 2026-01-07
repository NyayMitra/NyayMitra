
import React from 'react';
import { SignIn } from '@clerk/clerk-react';
import {AuroraBackground} from '@/components/ui/aurora-background'

const SignInPage = () => {
  return (
    <AuroraBackground className={`bg-[#2323FF]`}>
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#fac702] mb-2">Welcome Back</h1>
        </div>
        <div className="flex justify-center">
            <SignIn 
                appearance={{
                    elements: {
                        formButtonPrimary: "bg-[#EFBF04] hover:bg-[#d4a904] text-black font-bold",
                        card: "bg-gray-900 border border-gray-800",
                        headerTitle: "text-white",
                        headerSubtitle: "text-gray-400",
                        socialButtonsBlockButton: "bg-gray-800 text-white border-gray-700 hover:bg-gray-700",
                        dividerLine: "bg-gray-700",
                        dividerText: "text-gray-400",
                        formFieldLabel: "text-gray-300",
                        formFieldInput: "bg-gray-800 border-gray-700 text-white",
                        footerActionText: "text-gray-400",
                        footerActionLink: "text-[#EFBF04] hover:text-[#d4a904]"
                    }
                }}
                signUpUrl="/sign-up"
                fallbackRedirectUrl="/chat"
            />
        </div>
      </div>
    </div>
    </AuroraBackground>
  );
};

export default SignInPage;
