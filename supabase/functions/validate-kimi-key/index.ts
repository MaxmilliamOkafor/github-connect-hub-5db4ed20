import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { apiKey } = await req.json();

    if (!apiKey || typeof apiKey !== "string") {
      return new Response(
        JSON.stringify({ valid: false, error: "API key is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Basic format validation for Kimi K2 API keys
    // Kimi K2 keys typically start with "sk-" and are 48+ characters
    const trimmedKey = apiKey.trim();
    
    if (!trimmedKey.startsWith("sk-")) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: "Invalid API key format. Kimi K2 API keys should start with 'sk-'" 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (trimmedKey.length < 40) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: "API key appears to be too short. Please check your key." 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Test the API key with Moonshot/Kimi K2 API
    // Kimi K2 uses the Moonshot API endpoint
    console.log("Testing Kimi K2 API key...");
    
    const testResponse = await fetch("https://api.moonshot.cn/v1/models", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${trimmedKey}`,
        "Content-Type": "application/json",
      },
    });

    console.log(`Kimi K2 API response status: ${testResponse.status}`);

    if (testResponse.ok) {
      const data = await testResponse.json();
      console.log("Kimi K2 API key validated successfully");
      
      // Extract available models for reference
      const models = data.data?.map((m: any) => m.id) || [];
      
      return new Response(
        JSON.stringify({ 
          valid: true, 
          message: "API key is valid",
          availableModels: models.slice(0, 5) // Return first 5 models
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle specific error responses
    const errorText = await testResponse.text();
    console.log(`Kimi K2 API error: ${testResponse.status} - ${errorText}`);

    let errorMessage = "Invalid API key";
    
    if (testResponse.status === 401) {
      errorMessage = "Invalid API key. Please check your Kimi K2 API key and try again.";
    } else if (testResponse.status === 403) {
      errorMessage = "API key access denied. Your account may need activation or has insufficient permissions.";
    } else if (testResponse.status === 429) {
      errorMessage = "Rate limit exceeded. Please wait a moment and try again.";
    } else if (testResponse.status === 402) {
      errorMessage = "Insufficient credits. Please recharge your Kimi K2 account.";
    } else if (testResponse.status >= 500) {
      errorMessage = "Kimi K2 service temporarily unavailable. Please try again later.";
    } else {
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error?.message || errorData.message || errorMessage;
      } catch {
        // Use default error message
      }
    }

    return new Response(
      JSON.stringify({ valid: false, error: errorMessage }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Validation error:", error);
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    // Check for network errors (can't connect to Kimi API)
    if (errorMessage.includes("fetch") || errorMessage.includes("network") || errorMessage.includes("connect")) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: "Could not connect to Kimi K2 API. Please check your internet connection and try again." 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ valid: false, error: `Validation failed: ${errorMessage}` }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
