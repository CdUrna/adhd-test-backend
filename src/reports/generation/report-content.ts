import { ReportPayload } from "../report.types";

const disclaimer =
  "This result is informational and is not a medical diagnosis. Consult a qualified healthcare professional if you have concerns about ADHD.";

export const highTraitsReport: ReportPayload = {
  disclaimer,
  sections: [
    {
      key: "understanding-score",
      type: "text",
      title: "Understanding Your Score",
      content:
        "Your score suggests that you exhibit high ADHD traits, meaning that attention difficulties, impulsivity, hyperactivity, and executive dysfunction significantly impact daily life. While these challenges can be frustrating, they are not insurmountable. Many individuals with high ADHD traits develop effective coping mechanisms that allow them to manage difficulties while harnessing their unique strengths.",
    },
    {
      key: "cognitive-strengths",
      type: "list",
      title: "Your Cognitive and Behavioral Strengths",
      content: "Despite these challenges, you possess real strengths:",
      items: [
        "Strong creative problem-solving abilities, adaptability, and enthusiasm",
        "Ability to think outside the box, offering innovative solutions others would not consider",
        "Highly energetic and passionate, bringing enthusiasm into projects and conversations",
        "Resilience — pushing forward despite setbacks",
        "Ability to hyperfocus on areas of interest can serve as a valuable asset when properly channeled",
      ],
    },
    {
      key: "emotional-regulation",
      type: "list",
      title: "Your Emotional Regulation and Impulse Control",
      content:
        "Your high ADHD traits may significantly influence your emotional experiences and reactions. You may:",
      items: [
        "Experience intense emotional highs and lows, sometimes reacting impulsively",
        "Struggle with frustration and impatience, making it difficult to regulate emotions in stressful situations",
        "Feel overwhelmed by minor setbacks or unexpected changes",
        "Find it challenging to control impulsive behaviors such as interrupting conversations or making snap decisions",
      ],
      outro:
        "While emotional regulation may be difficult, learning self-awareness techniques and coping strategies can help create more emotional stability.",
    },
  ],
  faq: [
    {
      question: "Does a high ADHD score mean I have ADHD?",
      answer:
        "This score suggests significant ADHD traits, but an official diagnosis requires professional evaluation.",
    },
    {
      question: "Can ADHD traits be strengths?",
      answer:
        "Some people associate these traits with creativity, energy, adaptability, and deep focus on subjects they care about.",
    },
    {
      question: "What strategies can help manage high ADHD traits?",
      answer:
        "Clear routines, smaller task steps, reminders, regular breaks, and professional support can all be helpful.",
    },
    {
      question: "Does this score mean I struggle with emotional regulation?",
      answer:
        "A high score can be associated with stronger emotional reactions, but experiences vary from person to person.",
    },
    {
      question: "How can I stay organized with high ADHD traits?",
      answer:
        "Use visible reminders, consistent routines, short task lists, and external tools such as calendars and timers.",
    },
    {
      question: "Can my ADHD trait levels change over time?",
      answer:
        "Your experience can change with environment, stress, sleep, routines, and the strategies you use.",
    },
  ],
};

export const lowTraitsReport: ReportPayload = {
  disclaimer,
  sections: [
    {
      key: "understanding-score",
      type: "text",
      title: "Understanding Your Score",
      content:
        "Your score suggests minimal ADHD traits. You show a strong ability to focus, self-regulate, and manage daily responsibilities. While occasional challenges may arise, they are unlikely to significantly impact your daily functioning.",
    },
    {
      key: "cognitive-strengths",
      type: "list",
      title: "Your Cognitive and Behavioral Strengths",
      content: "",
      items: [
        "Strong ability to sustain attention and complete tasks",
        "Consistent and reliable in personal and professional responsibilities",
        "Good impulse control and measured decision-making",
        "Effective time management and organizational skills",
      ],
    },
    {
      key: "emotional-regulation",
      type: "text",
      title: "Your Emotional Regulation and Impulse Control",
      content:
        "Your low ADHD traits suggest strong emotional regulation in most situations. You are generally able to manage stress, frustration, and unexpected changes without significant difficulty. Maintaining healthy routines and mindfulness practices can help preserve this stability.",
    },
  ],
  faq: [
    {
      question: "Does a low ADHD score mean I definitely don't have ADHD?",
      answer:
        "A low score suggests minimal ADHD traits, but if you have concerns, a professional evaluation can provide a definitive answer.",
    },
    {
      question: "Can I still benefit from brain training with low ADHD traits?",
      answer:
        "Yes. Brain training, planning, healthy routines, breaks, and mindfulness can support cognitive performance.",
    },
    {
      question: "What can I do to maintain my strong cognitive performance?",
      answer:
        "Keep challenging yourself, protect your sleep, exercise regularly, and maintain routines that support focus.",
    },
    {
      question: "Can my ADHD trait levels change over time?",
      answer:
        "Your experience can vary with stress, sleep, environment, health, and other circumstances.",
    },
    {
      question: "Is a low score something to be proud of?",
      answer:
        "It reflects strengths in the areas measured by this assessment, but it is not a judgment of personal worth or ability.",
    },
  ],
};
