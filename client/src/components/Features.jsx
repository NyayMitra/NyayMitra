import React, { useEffect, useRef, useState } from 'react';
import { CardContainer, CardBody, CardItem } from "@/components/ui/3d-card";
import card1 from '/card1.svg'
import card2 from '/card2.svg'

const Features = () => {
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

    return () => {
      cardRefs.current.forEach((el) => {
        if (el) observer.unobserve(el);
      });
    };
  }, []);

  const features = [
    {
      title: "Case Identification",
      description: "Describe your situation, and Nyay Mitra instantly suggests the relevant legal sections under Indian law.",
      image: card1,
      imageAlt: "Legal case identification with AI assistance"
    },
    {
      title: "Guided Legal Steps", 
      description: "Get clear explanations and step-by-step guidance to understand and approach any legal problem.",
      image: card2,
      imageAlt: "Step-by-step legal guidance interface"
    }
  ];

  return (
    <section className="py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8 bg-black bg-[radial-gradient(circle_at_left_center,_#2323FF_0%,_#06102A_18%,_transparent_50%),radial-gradient(circle_at_bottom_right,_#2323FF_0%,_transparent_25%)]" id='features'>
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 px-4">
            Features of product
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 max-w-7xl mx-auto">
          {features.map((feature, index) => (
            <div
              key={index}
              ref={(el) => (cardRefs.current[index] = el)}
              data-index={index}
              className={`transform transition-all duration-700 ${
                visibleCards.includes(String(index))
                  ? 'translate-y-0 opacity-100'
                  : 'translate-y-20 opacity-0'
              }`}
            >
              <CardContainer className="w-full" containerClassName="py-0">
                <CardBody className="relative group/card bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border-2 border-gray-700 hover:border-[#EFBF04] transition-all duration-300 rounded-xl p-6 sm:p-8 lg:p-10 flex flex-col h-full min-h-[450px] sm:min-h-[500px] w-full sm:w-[30rem]">
                  {/* Title */}
                  <CardItem
                    translateZ="50"
                    className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white group-hover:text-[#EFBF04] transition-colors duration-300 text-center mb-6 sm:mb-8"
                  >
                    {feature.title}
                  </CardItem>

                  {/* Image Container with background */}
                  <CardItem 
                    translateZ="100" 
                    className="w-full flex-grow flex items-center justify-center mb-6 sm:mb-8 bg-gray-50 rounded-xl p-4 sm:p-6 lg:p-8 min-h-[220px] sm:min-h-[260px] lg:min-h-[300px]"
                  >
                    <img
                      src={feature.image}
                      height="1000"
                      width="1000"
                      className="w-full h-full object-contain max-h-[200px] sm:max-h-[240px] lg:max-h-[280px]"
                      alt={feature.imageAlt}
                    />
                  </CardItem>

                  {/* Description */}
                  <CardItem
                    as="p"
                    translateZ="60"
                    className="text-gray-300 text-base sm:text-lg lg:text-xl text-center leading-relaxed px-2"
                  >
                    {feature.description}
                  </CardItem>
                </CardBody>
              </CardContainer>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;