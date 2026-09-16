from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from openai import OpenAI
import os
import hashlib
from datetime import datetime

load_dotenv()

app = FastAPI(title="BhashaSetu AI")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

API_KEY = os.getenv("OPENAI_API_KEY")

if not API_KEY:
    print("WARNING: OPENAI_API_KEY not found in .env")

client = OpenAI(api_key=API_KEY) if API_KEY else None


# ---------------- DATA ----------------

USERS = {
    "teacher@demo.com": {
        "name": "Demo Teacher",
        "password": hashlib.sha256("1234".encode()).hexdigest()
    }
}

HISTORY = []


# ---------------- MODELS ----------------

class SignupRequest(BaseModel):
    name: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class TranslateRequest(BaseModel):
    text: str
    source_language: str
    target_language: str


class ExplainRequest(BaseModel):
    topic: str
    language: str = "English"


class HomeworkRequest(BaseModel):
    topic: str
    grade: str
    language: str = "English"
    count: int = 5


# ---------------- BASIC ----------------

@app.get("/")
def home():
    return {
        "message": "BhashaSetu AI Backend Running",
        "status": "success"
    }


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "ai_connected": client is not None
    }


# ---------------- LOGIN ----------------

@app.post("/api/signup")
def signup(data: SignupRequest):

    email = data.email.lower().strip()

    if email in USERS:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    USERS[email] = {
        "name": data.name,
        "password": hashlib.sha256(
            data.password.encode()
        ).hexdigest()
    }

    return {
        "name": data.name,
        "email": email
    }


@app.post("/api/login")
def login(data: LoginRequest):

    email = data.email.lower().strip()

    user = USERS.get(email)

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    password_hash = hashlib.sha256(
        data.password.encode()
    ).hexdigest()

    if password_hash != user["password"]:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    return {
        "name": user["name"],
        "email": email
    }


# ---------------- AI TRANSLATION ----------------

@app.post("/api/translate")
def translate(data: TranslateRequest):

    if not data.text.strip():
        raise HTTPException(
            status_code=400,
            detail="Text cannot be empty"
        )

    if client is None:
        raise HTTPException(
            status_code=500,
            detail="OpenAI API key not configured"
        )

    prompt = f"""
You are BhashaSetu AI, an educational translation assistant.

Translate the following classroom sentence from
{data.source_language} to {data.target_language}.

Rules:
1. Translate the complete sentence.
2. Do not give explanations.
3. Do not give multiple alternatives.
4. Preserve the original meaning.
5. Use natural and commonly understandable language.
6. This is for primary-school classroom teaching.
7. If the target language is Santali, produce Santali.
8. If the target language is Mundari, produce Mundari.
9. Return ONLY the translation.

Source sentence:
{data.text}
"""

    try:

        response = client.responses.create(
            model="gpt-5.6-luna",
            input=prompt
        )

        translation = response.output_text.strip()

        if not translation:
            raise Exception("Empty AI response")

        HISTORY.insert(
            0,
            {
                "time": datetime.now().strftime("%H:%M:%S"),
                "source": data.source_language,
                "target": data.target_language,
                "input": data.text,
                "output": translation,
                "confidence": 90
            }
        )

        if len(HISTORY) > 50:
            HISTORY.pop()

        return {
            "original_text": data.text,
            "translation": translation,
            "source_language": data.source_language,
            "target_language": data.target_language,
            "confidence": 90,
            "mode": "AI Translation",
            "route": f"{data.source_language} → {data.target_language}",
            "found": True
        }

    except Exception as e:

        print("Translation error:", e)

        raise HTTPException(
            status_code=500,
            detail=f"AI translation failed: {str(e)}"
        )


# ---------------- HISTORY ----------------

@app.get("/api/history")
def get_history():
    return HISTORY


# ---------------- AI EXPLAIN ----------------

@app.post("/api/explain")
def explain(data: ExplainRequest):

    if client is None:
        raise HTTPException(
            status_code=500,
            detail="OpenAI API key not configured"
        )

    prompt = f"""
You are an AI teacher assistant.

Explain this topic to a primary school student.

Topic: {data.topic}
Language: {data.language}

Return the answer in this exact structure:

SIMPLE:
one short and easy explanation

POINTS:
- point 1
- point 2
- point 3
- point 4

ACTIVITY:
one simple classroom activity
"""

    try:

        response = client.responses.create(
            model="gpt-5.6-luna",
            input=prompt
        )

        text = response.output_text.strip()

        simple = ""
        points = []
        activity = ""

        if "SIMPLE:" in text:
            part = text.split("SIMPLE:", 1)[1]

            if "POINTS:" in part:
                simple = part.split("POINTS:", 1)[0].strip()

                part2 = part.split("POINTS:", 1)[1]

                if "ACTIVITY:" in part2:
                    point_text = part2.split(
                        "ACTIVITY:", 1
                    )[0].strip()

                    activity = part2.split(
                        "ACTIVITY:", 1
                    )[1].strip()

                    for line in point_text.splitlines():
                        line = line.strip("- ").strip()

                        if line:
                            points.append(line)

        if not simple:
            simple = text

        if not points:
            points = [
                "Understand the basic idea",
                "Remember the important points",
                "Discuss the topic in class"
            ]

        if not activity:
            activity = "Ask students to explain the topic in their own words."

        return {
            "topic": data.topic,
            "language": data.language,
            "simple": simple,
            "points": points,
            "activity": activity
        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# ---------------- AI HOMEWORK ----------------

@app.post("/api/homework")
def homework(data: HomeworkRequest):

    if client is None:
        raise HTTPException(
            status_code=500,
            detail="OpenAI API key not configured"
        )

    count = max(1, min(data.count, 20))

    prompt = f"""
Create {count} simple homework questions.

Topic: {data.topic}
Class: {data.grade}
Language: {data.language}

Rules:
- Suitable for primary school students.
- Questions should be simple.
- Return ONLY numbered questions.
"""

    try:

        response = client.responses.create(
            model="gpt-5.6-luna",
            input=prompt
        )

        text = response.output_text.strip()

        questions = []

        for line in text.splitlines():

            line = line.strip()

            if not line:
                continue

            # Remove common numbering
            cleaned = line

            if "." in cleaned[:4]:
                cleaned = cleaned.split(".", 1)[1].strip()

            elif ")" in cleaned[:4]:
                cleaned = cleaned.split(")", 1)[1].strip()

            if cleaned:
                questions.append(cleaned)

        questions = questions[:count]

        return {
            "topic": data.topic,
            "grade": data.grade,
            "language": data.language,
            "questions": questions
        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# ---------------- STATS ----------------

@app.get("/api/stats")
def stats():

    return {
        "translations": len(HISTORY),
        "languages": 2,
        "status": "AI Active"
    }