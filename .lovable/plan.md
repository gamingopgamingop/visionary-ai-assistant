

# AI Image Toolkit

A clean, minimal web app that serves as an all-in-one AI-powered image tool. Users upload images and choose from a suite of AI-powered features.

## Pages & Layout

### Landing Page
- Hero section explaining the toolkit with a clean, modern look
- Feature cards showing all available tools
- Central "Get Started" call-to-action

### Image Workspace (main app page)
- Drag-and-drop image upload area (or click to browse)
- Tab-based tool selector across the top
- Side-by-side before/after view for transformation tools
- Download button for all results

## AI Features (tabs)

### 1. Analyze
Upload an image and get a detailed AI description — what's in it, colors, mood, composition.

### 2. Detect Objects
Identify and label objects found in the image with a structured list of detected items.

### 3. Extract Text (OCR)
Pull text content from photos, screenshots, documents, or receipts. Display extracted text in a copyable format.

### 4. Compare Images
Upload two images side-by-side and get an AI analysis of similarities and differences.

### 5. Enhance / Upscale
Upload a low-quality image and get an enhanced, sharper version back.

### 6. Inpaint / Repair
Upload a damaged or incomplete image and have AI fill in the missing parts.

### 7. Style Transfer
Upload an image and describe a style (e.g., "oil painting", "anime") to get a restyled version.

### 8. Generate from Description
Type a text prompt and generate a new image from scratch.

## Backend
- Lovable Cloud with edge functions calling Lovable AI Gateway
- Uses Gemini models for image analysis (text tasks) and Gemini image model for generation/reconstruction tasks
- All AI processing happens server-side via edge functions

## Design
- Clean white/light theme with subtle gray accents
- Large image previews as the focal point
- Minimal chrome — the images are the star
- Loading states with progress indicators during AI processing
- Responsive layout for mobile and desktop

