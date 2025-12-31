import React, { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import testimonial3 from "/testimonial3.png";
import college_student from "/college_student.jpg"
import enterprenure from "/enterprenure.jpg"

const Testimonials = () => {
  const [visibleCards, setVisibleCards] = useState([]);
  const cardRefs = useRef([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisibleCards((prev) => [...prev, entry.target.dataset.index]);
          }
        });
      },
      { threshold: 0.1 }
    );

    cardRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const testimonials = [
    {
      name: "Rohit Sharma",
      role: "College Student",
      image: college_student,
      quote:
        "I was completely lost when an incident happened in my neighborhood. Nyay Mitra helped me instantly understand which legal sections applied and what action I could take. It felt like having a lawyer friend by my side.",
    },
    {
      name: "Priya Menon",
      role: "Entrepreneur",
      image: enterprenure,
      quote:
        "As a small business owner, I often face legal queries but don't have time for long consultations. Nyay Mitra gave me quick, clear steps to follow and saved me both time and stress.",
    },
    {
      name: "Aditya Verma",
      role: "Law Student",
      image: testimonial3,
      quote:
        "Even as a law student, I find Nyay Mitra incredibly useful. It simplifies complex topics, helps me revise cases faster, and gives practical insights I can apply during my internships.",
    },
  ];

  return (
    <section className="py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8 bg-[radial-gradient(circle_at_top_right,_#2323FF_0%,_#06102A_20%,_transparent_30%)]">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 px-4 ">
            Hear from <span className="text-gradient">our customers</span>
          </h2>
        </div>
      

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 ">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              ref={(el) => (cardRefs.current[index] = el)}
              data-index={index}
              className={`transform transition-all duration-700 ${
                visibleCards.includes(index.toString())
                  ? "translate-y-0 opacity-100"
                  : "translate-y-20 opacity-0"
              }`}
            >
              <Card className="border-2 border-gray-700  shadow-card hover:shadow-glow transition-all duration-500 group bg-gradient-to-bl from-blue-900/30 to-black via-blue-950/50 backdrop-blur-sm h-full hover:bg-gray-900/50 hover:scale-105 hover:-translate-y-2 hover:border-[#EFBF04]">
                <CardContent className="p-6 sm:p-8 flex flex-col h-full min-h-[380px] sm:min-h-[420px]">
                  <div className="flex flex-col items-center text-center mb-6">
                    <Avatar className="w-20 h-20 sm:w-24 sm:h-24 ring-2 ring-accent/50 group-hover:ring-[#EFBF04] transition-all duration-300 group-hover:scale-110">
                      <AvatarImage
                        src={testimonial.image}
                        alt={`${testimonial.name} - ${testimonial.role}`}
                        className="object-cover"
                      />
                      <AvatarFallback className="bg-primary text-primary-foreground text-lg font-semibold">
                        {testimonial.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <blockquote className="text-gray-300 text-sm sm:text-base leading-relaxed text-center italic flex-grow mb-6 group-hover:text-gray-100 transition-colors duration-300">
                    "{testimonial.quote}"
                  </blockquote>
                  <div className="text-center pt-4 sm:pt-6 border-t border-gray-700/50">
                    <p className="font-semibold text-base sm:text-lg text-gray-300 group-hover:text-white transition-colors duration-300 mb-1">
                      — {testimonial.name}
                    </p>
                    <p className="text-sm sm:text-base text-[#EFBF04]">
                      {testimonial.role}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;