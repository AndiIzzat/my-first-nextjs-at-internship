import { GoogleGenAI, Type } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import { generateImage, generateImageFromImage, generateAnimation, ImageGenerationOptions } from "@/lib/image-generator";

// Increase timeout for image generation (60 seconds)
export const maxDuration = 60;

// Helper function for retry with exponential backoff
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error;
      const errorStr = String(error).toLowerCase() + JSON.stringify(error).toLowerCase();
      // Retry on rate limit OR overloaded errors
      if (
        errorStr.includes("429") ||
        errorStr.includes("resource_exhausted") ||
        errorStr.includes("quota") ||
        errorStr.includes("503") ||
        errorStr.includes("overloaded") ||
        errorStr.includes("unavailable")
      ) {
        const delay = initialDelay * Math.pow(2, i); // 1s, 2s, 4s
        console.log(`API error, retrying in ${delay}ms (attempt ${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error; // Other errors, don't retry
      }
    }
  }
  throw lastError;
}

const SYSTEM_PROMPT = `You are Izzat Bot, a friendly and helpful virtual assistant representing Andi Izzat Shafran Ashari.

=== PERSONAL INFORMATION ===
Name: Andi Izzat Shafran Ashari
Title: Graphic Designer & UI/UX Enthusiast
Birthday: February 25, 2008
Address: Minasaupa Blok G2 No.15
Phone: 0822-7159-8281
Email: andiifran25@gmail.com
Instagram: @izzat.shafran
GitHub: github.com/izzatshafran
LinkedIn: linkedin.com/in/izzatshafran
Portfolio: Check the Projects section on this website

=== PROFILE SUMMARY ===
A passionate graphic designer who pays close attention to aesthetics and detail. Enjoys creating visuals that are not only visually appealing but also meaningful and functional. Experienced in branding, typography, layout design, and social media content design. Comfortable working under deadlines, collaborating with teams, and presenting design results professionally.

=== EDUCATION ===
1. SMK Telkom Makassar (2023 – Present, Grade XII)
   - Major: Software Engineering (RPL) – Focus on Graphic Design Technology
2. SMP Negeri 1 Palu (2020 – 2023)
3. Elementary: Housing Directive Primary School III (Makassar), SDN Tanamodindi (Palu), SD Muhammadiyah Palu, and one year of homeschooling in Jakarta

=== ORGANIZATIONAL EXPERIENCE ===
Student Council (OSIS) – SMK Telkom Makassar
- Design & Photography Division (Grade X)
- Responsible for graphic design and photography
- Part of Publication and Documentation (Pubdok) team
- Designed promotional visuals and documented events

=== PROFESSIONAL EXPERIENCE ===
Graphic Designer at Telkom School Indonesia
- Designed and managed social media feed content for official account representing all Telkom Schools across Indonesia
- Maintained consistent national visual identity across posts and campaigns
- Collaborated with content and communication teams
- Worked under tight deadlines to deliver high-quality visual content

=== COMPETITIONS & ACHIEVEMENTS ===
1. LKS SMK National Competition 2025 - Delegate (Graphic Design Technology)
   - Represented South Sulawesi at national level
2. LKS SMK South Sulawesi Province 2025 - 1st Place (Graphic Design Technology)
   - Created brand guidelines, A3 posters, Instagram feeds/stories, product mockups
3. ENIAC Graphic Design Competition - 2nd Place (Two Consecutive Years)
4. PNUP Electro Invention Race 2024 - 3rd Place (Graphic Design Category)

=== PROJECTS ===
1. SEEDS – Full-Stack Web Application
   - Role: Full-Stack Developer
   - Built with Laravel framework
   - Designed and implemented UI/UX
   - Features: User management, data analytics, responsive design

2. Telkom School Social Media Campaign
   - National-level social media content design
   - Consistent branding across all platforms
   - High engagement rates

3. Various Branding Projects
   - Logo design, brand guidelines, marketing materials
   - Clients include local businesses and school organizations

=== SKILLS ===
Design Skills: Branding, Typography, Editorial Layout, Social Media Content Design (poster, feed, story)
Design Tools: Adobe Illustrator, Adobe Photoshop, Adobe InDesign, Figma (basic UI/UX)
Programming: HTML, CSS, JavaScript (Front-End), PHP, Laravel (Back-End), Git, GitHub
Soft Skills: Communication, Time Management, Teamwork, Presentation Skills

=== AVAILABILITY STATUS ===
- Currently: Student at SMK Telkom Makassar (Grade XII)
- Open for: Freelance design projects, internship opportunities, collaboration
- Response time: Usually within 24 hours
- Preferred contact: Email or Instagram DM

=== FUN FACTS ABOUT IZZAT ===
1. Started learning design at age 14
2. Has designed for 50+ projects including school events and local businesses
3. Favorite design style: Minimalist with bold typography
4. Dream: To work at a top creative agency or start own design studio
5. Hobby: Playing basketball helps maintain creativity and focus
6. Music preference: Listens to lo-fi and jazz while designing
7. Favorite designer: Massimo Vignelli for his timeless minimalist approach
8. Can work in both Indonesian and English
9. Night owl - most productive designing at night
10. Coffee lover - essential for late-night design sessions

=== DESIGN QUOTES IZZAT LOVES ===
- "Design is not just what it looks like, design is how it works." - Steve Jobs
- "Simplicity is the ultimate sophistication." - Leonardo da Vinci
- "Good design is obvious. Great design is transparent." - Joe Sparano
- "The details are not the details. They make the design." - Charles Eames

=== BOT PERSONALITY ===
- Friendly, approachable, and professional
- Helpful and informative
- Enthusiastic about design and technology
- Respond in a conversational manner
- Keep responses concise but helpful (2-4 sentences typically)
- Use casual but professional language
- Add occasional emojis to be friendly but not excessive

=== MULTI-LANGUAGE SUPPORT ===
- If user writes in Indonesian, respond in Indonesian
- If user writes in English, respond in English
- Can switch languages mid-conversation if user switches

=== CONVERSATION MEMORY ===
- If user introduces themselves (e.g., "I'm John" or "My name is Sarah"), remember and use their name
- Reference previous topics discussed in the conversation when relevant
- Build on previous answers to provide continuity

=== MOOD DETECTION ===
- If user seems frustrated (using caps, "!!!", negative words), respond with empathy: "I understand this might be frustrating..."
- If user seems happy or excited, match their energy
- If user seems confused, offer to clarify and ask follow-up questions

=== FOLLOW-UP QUESTIONS ===
- If query is unclear, ask clarifying questions instead of guessing
- Suggest related topics user might be interested in
- Example: "Are you interested in Izzat's design work or programming skills?"

=== EASTER EGGS (Secret Responses) ===
- If user says "tell me a secret": Share a fun behind-the-scenes fact about Izzat
- If user says "design tip": Share a professional design tip
- If user says "tell me a joke": Tell a design or programming joke
- If user says "quiz me": Ask a fun question about design or Izzat
- If user says "motivate me": Share an inspiring quote
- If user says "what's your favorite color": "Izzat loves working with monochromatic palettes, especially black and white with accent colors!"
- If user types "konami" or "easter egg": "You found a secret! Izzat is also a casual gamer who enjoys puzzle and strategy games!"

=== DESIGN/PROGRAMMING JOKES ===
1. "Why do designers always feel cold? Because they're surrounded by drafts!"
2. "A SQL query walks into a bar, walks up to two tables and asks, 'Can I join you?'"
3. "Why did the developer go broke? Because he used up all his cache!"
4. "How many designers does it take to change a lightbulb? Does it have to be a lightbulb?"
5. "Why do programmers prefer dark mode? Because light attracts bugs!"

=== QUIZ QUESTIONS ===
1. "What software is best for vector graphics? (Answer: Adobe Illustrator)"
2. "What does UI stand for? (Answer: User Interface)"
3. "What year did Izzat win 1st place at LKS Provincial? (Answer: 2025)"
4. "What framework did Izzat use for SEEDS project? (Answer: Laravel)"

=== HOROSCOPE / ZODIAC ===
Izzat's Zodiac: Pisces (February 25)
Pisces Traits that match Izzat:
- Creative and artistic (perfect for design!)
- Intuitive and empathetic
- Imaginative and dreamy
- Adaptable and flexible
- Compassionate and understanding
If user asks about horoscope/zodiac, share fun Pisces facts and how they relate to Izzat's personality.

=== SPECIAL MODES (Trigger Keywords) ===

1. "interview me" or "practice interview":
   - Switch to Interview Mode
   - Ask portfolio/design interview questions one by one
   - Questions like: "Tell me about your design process?", "What's your favorite project and why?", "How do you handle creative blocks?"
   - Give feedback on answers

2. "roast me" or "roast izzat":
   - Give a FRIENDLY, PLAYFUL roast (not mean!)
   - Examples: "Oh, you use Canva? That's cute", "Let me guess, you think Comic Sans is a personality?"
   - Keep it light and funny, never offensive

3. "compliment me" or "hype me up":
   - Give enthusiastic compliments about design/creativity
   - Be encouraging and motivational
   - Examples: "Your dedication to design is inspiring!", "The design world is lucky to have someone as passionate as you!"

4. "recommend" or "suggest resources":
   - Recommend design resources, tutorials, tools
   - Free resources: Figma, Canva, Unsplash, Google Fonts, Coolors
   - Learning: YouTube channels, Skillshare, Domestika
   - Inspiration: Dribbble, Behance, Awwwards, Pinterest

5. "help me with" or "give me tips for":
   - Provide specific design tips based on topic
   - Logo design, color theory, typography, layout, UI/UX, etc.

6. "what time is it in [city]":
   - Convert current time to requested timezone
   - Common cities: Tokyo, New York, London, Sydney, Jakarta

7. "random fact":
   - Share a random interesting design or tech fact

8. "play a game" or "let's play":
   - Offer mini games: Design trivia, Guess the logo, Color naming challenge

=== DESIGN RESOURCES TO RECOMMEND ===
Free Tools:
- Figma (UI/UX design)
- Canva (Quick designs)
- Photopea (Free Photoshop alternative)
- Coolors.co (Color palettes)
- Google Fonts (Typography)
- Unsplash/Pexels (Free photos)

Learning Platforms:
- YouTube: The Futur, Flux Academy, DesignCourse
- Skillshare, Domestika, Coursera

Inspiration:
- Dribbble, Behance, Awwwards, Pinterest, Mobbin

=== IMAGE GENERATION CAPABILITY ===
IMPORTANT: You have the ability to generate images using the generate_image tool.
- When user asks to create, generate, draw, make, or produce an image, USE the generate_image tool
- When user says things like "create an image of...", "generate a picture of...", "draw me a...", "make an image...", USE the generate_image tool
- Before calling the tool, briefly explain what you're about to create
- Create a detailed English prompt for the image generation
- After the image is generated, provide a friendly message about the result

=== IMAGE EDITING CAPABILITY ===
IMPORTANT: You can also EDIT previously generated images!
- When user says "edit the image", "modify the image", "change the image", "add to the image", USE the generate_image tool with a MODIFIED prompt
- Look at the conversation history to find the previous image prompt
- Combine the original prompt with the user's edit request to create a new detailed prompt
- Example: If original was "a cat" and user says "add a hat", create prompt: "a cat wearing a hat"
- Always acknowledge that you're editing/modifying the previous image
- The edited image will be a new generation based on the combined description

=== GUIDELINES ===
- Always be helpful and friendly
- Answer questions based on the information above
- Use appropriate greeting based on time of day provided in realtime info
- For contact inquiries, share email (andiifran25@gmail.com) or Instagram (@izzat.shafran)
- When mentioning projects, suggest checking the Projects section on the website
- If user asks about hiring/freelance, mention availability status
- Include relevant links when discussing social media or portfolio
- If you don't know something specific, say so politely and offer alternatives`;

const getRealtimeInfo = () => {
  const now = new Date();

  // Get Makassar time (WITA = UTC+8)
  const makassarTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Makassar' }));
  const hour = makassarTime.getHours();

  // Determine greeting based on time
  let greeting = "";
  let timeOfDay = "";
  if (hour >= 5 && hour < 12) {
    greeting = "Good morning";
    timeOfDay = "morning";
  } else if (hour >= 12 && hour < 17) {
    greeting = "Good afternoon";
    timeOfDay = "afternoon";
  } else if (hour >= 17 && hour < 21) {
    greeting = "Good evening";
    timeOfDay = "evening";
  } else {
    greeting = "Good night";
    timeOfDay = "night (Izzat's most productive design time!)";
  }

  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Makassar'
  };
  const formattedDate = now.toLocaleDateString('en-US', options);
  const formattedTime = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Makassar'
  });

  // Calculate Izzat's age
  const birthday = new Date('2008-02-25');
  let age = now.getFullYear() - birthday.getFullYear();
  const monthDiff = now.getMonth() - birthday.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birthday.getDate())) {
    age--;
  }

  // Check if today is Izzat's birthday
  const isBirthday = makassarTime.getMonth() === 1 && makassarTime.getDate() === 25;
  const birthdayNote = isBirthday ? "TODAY IS IZZAT'S BIRTHDAY! Wish him a happy birthday!" : "";

  // Days until next birthday
  const nextBirthday = new Date(makassarTime.getFullYear(), 1, 25);
  if (makassarTime > nextBirthday) {
    nextBirthday.setFullYear(nextBirthday.getFullYear() + 1);
  }
  const daysUntilBirthday = Math.ceil((nextBirthday.getTime() - makassarTime.getTime()) / (1000 * 60 * 60 * 24));

  return `
=== REALTIME INFORMATION ===
Current Date: ${formattedDate}
Current Time: ${formattedTime} (WITA - Makassar Time)
Time of Day: ${timeOfDay}
Suggested Greeting: ${greeting}
Izzat's Current Age: ${age} years old
Days Until Izzat's Birthday: ${daysUntilBirthday} days (February 25)
${birthdayNote}

INSTRUCTION: Use the suggested greeting naturally when user says hi/hello. For example: "${greeting}! How can I help you today?"
`;
};

// Advanced Image generation tools declaration - Multiple tools for different use cases
const generateImageTool = {
  functionDeclarations: [
    {
      name: "generate_image",
      description: "Generate a new image from text description. Use when user asks to create, generate, draw, design, or make an image/picture/photo/illustration. Can also edit existing images when user says 'edit', 'change', 'modify' the image. Can enhance simple prompts for better results.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          prompt: {
            type: Type.STRING,
            description: "Detailed image description in English. Be specific about subject, style, colors, mood, lighting, and composition.",
          },
          style: {
            type: Type.STRING,
            description: "Art style for the image: realistic, anime, cartoon, digital-art, oil-painting, watercolor, sketch, 3d-render, pixel-art, minimalist",
          },
          aspect_ratio: {
            type: Type.STRING,
            description: "Image aspect ratio: 1:1 (square), 16:9 (landscape), 9:16 (portrait), 4:3, 3:4",
          },
          mood: {
            type: Type.STRING,
            description: "Overall mood/atmosphere: happy, dark, peaceful, energetic, mysterious, romantic, dramatic, whimsical",
          },
          is_edit: {
            type: Type.BOOLEAN,
            description: "Set to true if this is editing a previous image",
          },
          edit_instruction: {
            type: Type.STRING,
            description: "If editing, what to change (e.g., 'add a hat', 'change background to beach')",
          },
        },
        required: ["prompt"],
      },
    },
  ],
};

interface HistoryMessage {
  text: string;
  sender: "user" | "bot";
}

interface ChatRequest {
  message: string;
  history?: HistoryMessage[];
  image?: string; // base64 image data for vision
  // Image generation options
  imageOptions?: {
    aspectRatio?: "1:1" | "16:9" | "9:16" | "4:3" | "3:4";
    negativePrompt?: string;
    referenceImage?: string; // For image-to-image
    isAnimation?: boolean; // For GIF generation
  };
}

// Detect if message is asking for image generation
function isImageGenerationRequest(message: string): boolean {
  const lowerMsg = message.toLowerCase();
  const generateKeywords = ["generate", "create", "make", "draw", "design", "buat", "bikin", "gambar", "buatkan", "gambarin", "tolong buat", "coba buat"];
  const imageKeywords = ["image", "picture", "photo", "gambar", "foto", "illustration", "art", "artwork", "visual"];

  // Check for generate + image combination
  const hasGenerateWord = generateKeywords.some(k => lowerMsg.includes(k));
  const hasImageWord = imageKeywords.some(k => lowerMsg.includes(k));

  // Also check for direct patterns
  const directPatterns = [
    /generate\s+(an?\s+)?image/i,
    /create\s+(an?\s+)?image/i,
    /make\s+(an?\s+)?image/i,
    /draw\s+(an?\s+)?/i,
    /buat(kan)?\s+gambar/i,
    /gambar(in|kan)?\s+/i,
    /bikin\s+gambar/i,
  ];

  const hasDirectPattern = directPatterns.some(p => p.test(lowerMsg));

  return (hasGenerateWord && hasImageWord) || hasDirectPattern;
}

// Extract image prompt from message
function extractImagePrompt(message: string): string {
  const lowerMsg = message.toLowerCase();

  // Remove common prefixes to get the actual prompt
  let prompt = message;
  const prefixPatterns = [
    /^(please\s+)?(can you\s+)?(generate|create|make|draw|design)\s+(an?\s+)?(image|picture|photo|illustration|art)\s+(of\s+)?/i,
    /^(tolong\s+)?(buat(kan)?|bikin|gambar(in|kan)?)\s+(gambar\s+)?/i,
    /^edit\s+the\s+(previous\s+)?image:?\s*/i,
    /^edit\s+gambar:?\s*/i,
  ];

  for (const pattern of prefixPatterns) {
    prompt = prompt.replace(pattern, "");
  }

  return prompt.trim() || message;
}

export async function POST(request: NextRequest) {
  try {
    const { message, history, image, imageOptions }: ChatRequest = await request.json();

    if ((!message || typeof message !== "string") && !image) {
      return NextResponse.json(
        { error: "Message or image is required" },
        { status: 400 }
      );
    }

    // Check if this is an image generation request - use Pollinations directly (NO Gemini needed!)
    if (message && isImageGenerationRequest(message)) {
      try {
        const imagePrompt = extractImagePrompt(message);
        console.log("Direct image generation with Pollinations:", imagePrompt);

        // Build generation options
        const genOptions: ImageGenerationOptions = {
          prompt: imagePrompt,
          aspectRatio: imageOptions?.aspectRatio || "1:1",
          negativePrompt: imageOptions?.negativePrompt,
        };

        let generatedImage: string | null = null;
        let responseMessage = "";

        // Check if this is animation request
        if (imageOptions?.isAnimation) {
          console.log("Generating animation...");
          generatedImage = await generateAnimation(imagePrompt, genOptions);
          responseMessage = `Here's the animation I created for "${imagePrompt}"! 🎬`;
        }
        // Check if this is image-to-image request
        else if (imageOptions?.referenceImage) {
          console.log("Generating image-to-image...");
          generatedImage = await generateImageFromImage(imageOptions.referenceImage, imagePrompt, genOptions);
          responseMessage = `Here's the transformed image based on your reference! 🎨`;
        }
        // Regular image generation
        else {
          generatedImage = await generateImage(genOptions);
          responseMessage = `Here's the image I created for "${imagePrompt}"! 🎨`;
        }

        if (generatedImage) {
          return NextResponse.json({
            success: true,
            response: responseMessage,
            image: generatedImage,
            isImageGeneration: true,
            isAnimation: imageOptions?.isAnimation || false,
          });
        } else {
          return NextResponse.json({
            success: true,
            response: "Sorry, I couldn't generate that image. Please try with a different description!",
          });
        }
      } catch (imageError) {
        console.error("Direct image generation failed:", imageError);
        const errorMessage = imageError instanceof Error ? imageError.message : "Unknown error";
        const errorStr = errorMessage.toLowerCase();

        // Check for rate limit / quota errors
        if (errorStr.includes("limit") || errorStr.includes("quota") || errorStr.includes("429")) {
          return NextResponse.json({
            success: true,
            response: "Sorry, I can't generate images right now - the free image generation quota has been exceeded. 😅 Please try again in about 1 hour. But I can still chat with you in the meantime!",
          });
        }

        // Check for timeout errors
        if (errorStr.includes("timeout") || errorStr.includes("timed out")) {
          return NextResponse.json({
            success: true,
            response: "The image is taking too long to generate. 🕐 The server might be busy. Please try again with a simpler description!",
          });
        }

        return NextResponse.json({
          success: true,
          response: `Sorry, I couldn't generate that image. ${errorMessage}`,
        });
      }
    }

    // Regular chat - use Gemini API
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "API key not configured" },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    // Build conversation context from history
    let conversationContext = "";
    if (history && Array.isArray(history)) {
      const recentHistory = history.slice(-10) as HistoryMessage[];
      conversationContext = recentHistory
        .map((msg) => `${msg.sender === "user" ? "User" : "Izzat Bot"}: ${msg.text}`)
        .join("\n");
    }

    // Get realtime information
    const realtimeInfo = getRealtimeInfo();

    // Build contents array for the API
    const systemContent = { role: "user" as const, parts: [{ text: SYSTEM_PROMPT + realtimeInfo }] };

    // Build history contents
    const historyContents = history?.map((msg) => ({
      role: msg.sender === "user" ? "user" as const : "model" as const,
      parts: [{ text: msg.text }],
    })) || [];

    // Build current message content
    let currentMessageParts: { text?: string; inlineData?: { mimeType: string; data: string } }[] = [];

    if (message) {
      currentMessageParts.push({ text: message });
    }

    if (image) {
      // Extract base64 data and mime type from data URL
      const matches = image.match(/^data:(.+);base64,(.+)$/);
      if (matches) {
        const mimeType = matches[1];
        const base64Data = matches[2];
        currentMessageParts.push({ inlineData: { mimeType, data: base64Data } });
        if (!message) {
          currentMessageParts.unshift({ text: "What do you see in this image?" });
        }
      }
    }

    const currentMessage = { role: "user" as const, parts: currentMessageParts };

    // Make API call with advanced tools (with retry for rate limits)
    const response = await withRetry(() =>
      ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          systemContent,
          ...historyContents,
          currentMessage,
        ],
        config: {
          tools: [generateImageTool],
        },
      })
    );

    // Check if AI wants to call any image-related function
    const functionCalls = response.functionCalls;

    if (functionCalls?.length && functionCalls[0].name === "generate_image") {
      const args = functionCalls[0].args as {
        prompt?: string;
        style?: string;
        aspect_ratio?: string;
        mood?: string;
        is_edit?: boolean;
        edit_instruction?: string;
      };

      let imagePrompt = args.prompt || "";

      if (!imagePrompt) {
        return NextResponse.json({
          success: true,
          response: "I'd love to generate an image for you, but I need more details about what you'd like me to create. Can you describe the image you want?",
        });
      }

      // Enhance prompt with style and mood if provided
      if (args.style) {
        imagePrompt = `${imagePrompt}, ${args.style} style`;
      }
      if (args.mood) {
        imagePrompt = `${imagePrompt}, ${args.mood} mood/atmosphere`;
      }

      // Handle edit mode
      const isEditMode = args.is_edit || false;
      if (isEditMode && args.edit_instruction) {
        imagePrompt = `${imagePrompt}, ${args.edit_instruction}`;
      }

      try {
        const genOptions: ImageGenerationOptions = {
          prompt: imagePrompt,
          aspectRatio: (args.aspect_ratio as "1:1" | "16:9" | "9:16" | "4:3" | "3:4") || "1:1",
        };

        const generatedImage = await generateImage(genOptions);

        if (generatedImage) {
          // Build response message with metadata
          let responseMsg = isEditMode
            ? `Here's the edited image! ✏️`
            : `Here's the image I created for you!`;

          // Add style/mood info
          const metadata: string[] = [];
          if (args.style) metadata.push(`Style: ${args.style}`);
          if (args.mood) metadata.push(`Mood: ${args.mood}`);
          if (args.aspect_ratio && args.aspect_ratio !== "1:1") metadata.push(`Ratio: ${args.aspect_ratio}`);

          if (metadata.length > 0) {
            responseMsg += ` 🎨 ${metadata.join(" | ")}`;
          }

          return NextResponse.json({
            success: true,
            response: responseMsg,
            image: generatedImage,
            isImageGeneration: true,
            isEdit: isEditMode,
            imageMetadata: {
              prompt: imagePrompt,
              style: args.style,
              aspectRatio: args.aspect_ratio,
              mood: args.mood,
            },
          });
        } else {
          return NextResponse.json({
            success: true,
            response: "I tried to generate the image, but something went wrong. Could you try describing it differently?",
          });
        }
      } catch (imageError: unknown) {
        console.error("Image generation failed:", imageError);
        return handleImageError(imageError);
      }
    }

    // Regular text response
    const responseText = response.text || "I apologize, I couldn't generate a response. Please try again.";

    return NextResponse.json({ success: true, response: responseText });
  } catch (error: unknown) {
    console.error("Gemini API Error:", error);

    // Convert error to string for checking
    const errorString = JSON.stringify(error).toLowerCase();
    const errorMessage = error instanceof Error ? error.message.toLowerCase() : "";
    const fullError = errorString + " " + errorMessage;

    // Rate limit / Quota exceeded
    if (
      fullError.includes("429") ||
      fullError.includes("quota") ||
      fullError.includes("rate") ||
      fullError.includes("resource_exhausted") ||
      fullError.includes("exhausted") ||
      fullError.includes("limit")
    ) {
      // Try to extract retry time from error
      const retryMatch = fullError.match(/retry.*?(\d+)/i);
      const retrySeconds = retryMatch ? parseInt(retryMatch[1]) : null;

      let retryMessage = "";
      if (retrySeconds && retrySeconds > 0) {
        if (retrySeconds < 60) {
          retryMessage = `Please try again in about ${retrySeconds} seconds.`;
        } else {
          const minutes = Math.ceil(retrySeconds / 60);
          retryMessage = `Please try again in about ${minutes} minute${minutes > 1 ? "s" : ""}.`;
        }
      } else {
        retryMessage = "Please try again in a few minutes.";
      }

      return NextResponse.json(
        {
          error: "rate_limit",
          response: `I'm taking a short break! The API has reached its limit. ${retryMessage} Thanks for your patience!`,
        },
        { status: 429 }
      );
    }

    // Invalid API key
    if (fullError.includes("api_key") || fullError.includes("invalid") || fullError.includes("expired")) {
      return NextResponse.json(
        {
          error: "invalid_key",
          response: "Oops! There's an issue with the API configuration. Please contact Izzat to fix this.",
        },
        { status: 401 }
      );
    }

    // Model overloaded (503)
    if (fullError.includes("503") || fullError.includes("overloaded") || fullError.includes("unavailable")) {
      return NextResponse.json(
        {
          error: "overloaded",
          response: "The AI is a bit busy right now! 🤖💤 Please wait a few seconds and try again.",
        },
        { status: 503 }
      );
    }

    // Generic error - show actual error for debugging
    const actualError = error instanceof Error ? error.message : "Unknown error";
    console.log("Full error details:", error);

    return NextResponse.json(
      {
        error: "server_error",
        response: `Oops! Something went wrong: ${actualError}. Please try again! 🔧`,
      },
      { status: 500 }
    );
  }
}

// Helper function to handle image generation errors
function handleImageError(imageError: unknown) {
  let errorStr = "";
  if (imageError instanceof Error) {
    errorStr = imageError.message.toLowerCase();
  }
  errorStr += " " + JSON.stringify(imageError).toLowerCase();

  console.log("Image error string:", errorStr);

  if (errorStr.includes("429") || errorStr.includes("quota") || errorStr.includes("exhausted") || errorStr.includes("resource_exhausted") || errorStr.includes("limit")) {
    return NextResponse.json({
      success: true,
      response: "Sorry, I can't generate images right now - the free image generation quota has been exceeded. 😅 Please try again in about 1 hour. But I can still chat with you in the meantime!",
    });
  }

  if (errorStr.includes("abort") || errorStr.includes("timeout")) {
    return NextResponse.json({
      success: true,
      response: "The image is taking too long to generate. 🕐 The server might be busy. Please try again with a simpler description!",
    });
  }

  if (errorStr.includes("network") || errorStr.includes("fetch") || errorStr.includes("econnrefused")) {
    return NextResponse.json({
      success: true,
      response: "I couldn't connect to the image generation service. 🌐 Please check your internet connection and try again!",
    });
  }

  const errorMessage = imageError instanceof Error ? imageError.message : 'Unknown error';
  return NextResponse.json({
    success: true,
    response: `Sorry, I couldn't generate that image. ${errorMessage}`,
  });
}
