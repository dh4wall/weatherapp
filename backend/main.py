import os
import requests
import google.generativeai as genai
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from langchain_core.prompts import PromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Set API Keys
os.environ["GOOGLE_API_KEY"] = os.getenv("GOOGLE_API_KEY")
os.environ["OPENWEATHER_API_KEY"] = os.getenv("OPENWEATHER_API_KEY")

# Initialize FastAPI
app = FastAPI()

# Enable CORS (for frontend requests)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins (change this for security)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Gemini 1.5 Pro Latest
genai.configure(api_key=os.environ["GOOGLE_API_KEY"])
llm = ChatGoogleGenerativeAI(model="gemini-1.5-pro-latest", temperature=0.5)

# Define the Weather API Function
def get_weather(city):
    api_key = os.environ["OPENWEATHER_API_KEY"]
    url = f"https://api.openweathermap.org/data/2.5/weather?q={city}&appid={api_key}&units=metric"

    response = requests.get(url)
    if response.status_code == 200:
        return response.json()
    return None

# Prompt to Extract City from User's Query
city_prompt = PromptTemplate.from_template("Extract the city name from this weather-related question: {query}")
city_chain = city_prompt | llm

# Prompt to Generate AI-based Response
response_prompt = PromptTemplate.from_template(
    "User asked: {query}\n"
    "Weather data for {city}: {weather_info}\n"
    "Based on this, generate a natural response answering the user's question."
)
response_chain = response_prompt | llm

# Pydantic Model for Request
class ChatRequest(BaseModel):
    query: str

# API Endpoint to Fetch Weather Data Directly
@app.get("/weather")
def fetch_weather(city: str = Query(..., description="City name to get weather for")):
    weather_data = get_weather(city)
    if not weather_data:
        return {"error": f"Could not fetch weather data for {city}."}
    
    return {
        "city": city,
        "temperature": f"{weather_data['main']['temp']}°C",
        "condition": weather_data['weather'][0]['description'],
        "humidity": f"{weather_data['main']['humidity']}%",
        "wind_speed": f"{weather_data['wind']['speed']} m/s"
    }

# API Endpoint for AI-Powered Weather Chat
@app.post("/chat")
def chat_with_ai(request: ChatRequest):
    user_input = request.query

    # Step 1: Extract City Name
    response = city_chain.invoke({"query": user_input})
    city = response.content.strip()

    if not city:
        return {"error": "I couldn't understand the city name. Please ask again."}

    # Step 2: Fetch Weather Data
    weather_data = get_weather(city)
    if not weather_data:
        return {"error": f"Sorry, I couldn't fetch the weather data for {city}."}

    # Step 3: Format Weather Data
    weather_info = (
        f"Temperature: {weather_data['main']['temp']}°C, "
        f"Condition: {weather_data['weather'][0]['description']}, "
        f"Humidity: {weather_data['main']['humidity']}%, "
        f"Wind Speed: {weather_data['wind']['speed']} m/s."
    )

    # Step 4: Let AI Generate the Final Response
    final_response = response_chain.invoke({"query": user_input, "city": city, "weather_info": weather_info})

    return {"response": final_response.content, "city": city, "weather": weather_info}

