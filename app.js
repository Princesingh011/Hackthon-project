const API = "http://127.0.0.1:8000";

const $ = id => document.getElementById(id);

let currentUser = null;
let recognition = null;
let listening = false;


// ---------------- TOAST ----------------

function toast(message) {

    const t = $("toast");

    if (!t) {
        alert(message);
        return;
    }

    t.textContent = message;
    t.classList.add("show");

    setTimeout(() => {
        t.classList.remove("show");
    }, 2500);
}


// ---------------- API ----------------

async function api(path, options = {}) {

    const response = await fetch(API + path, options);

    let data = {};

    try {
        data = await response.json();
    } catch {
        data = {};
    }

    if (!response.ok) {
        throw new Error(
            data.detail || "Server request failed"
        );
    }

    return data;
}


function jsonBody(data) {

    return {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
    };
}


// ==================================================
// LOGIN / SIGNUP
// ==================================================

if ($("loginTab")) {

    $("loginTab").onclick = () => {
        toggleAuth("login");
    };
}


if ($("signupTab")) {

    $("signupTab").onclick = () => {
        toggleAuth("signup");
    };
}


function toggleAuth(mode) {

    $("loginTab").classList.toggle(
        "active",
        mode === "login"
    );

    $("signupTab").classList.toggle(
        "active",
        mode === "signup"
    );

    $("loginForm").classList.toggle(
        "hidden",
        mode !== "login"
    );

    $("signupForm").classList.toggle(
        "hidden",
        mode !== "signup"
    );
}


if ($("loginBtn")) {

    $("loginBtn").onclick = async () => {

        try {

            const data = await api(
                "/api/login",
                jsonBody({
                    email: $("loginEmail").value,
                    password: $("loginPassword").value
                })
            );

            enterApp(data);

        } catch (error) {

            toast(error.message);
        }
    };
}


if ($("signupBtn")) {

    $("signupBtn").onclick = async () => {

        try {

            const data = await api(
                "/api/signup",
                jsonBody({
                    name: $("signName").value,
                    email: $("signEmail").value,
                    password: $("signPassword").value
                })
            );

            enterApp(data);

        } catch (error) {

            toast(error.message);
        }
    };
}


function enterApp(user) {

    currentUser = user;

    $("auth").classList.add("hidden");

    $("app").classList.remove("hidden");

    $("userName").textContent = user.name;

    $("avatar").textContent =
        user.name.charAt(0).toUpperCase();

    showPage("home");

    toast("Welcome to BhashaSetu AI");
}


if ($("logout")) {

    $("logout").onclick = () => {

        currentUser = null;

        $("app").classList.add("hidden");

        $("auth").classList.remove("hidden");
    };
}


// ==================================================
// NAVIGATION
// ==================================================

document.querySelectorAll(".nav").forEach(button => {

    button.onclick = () => {

        showPage(button.dataset.page);
    };
});


document.querySelectorAll("[data-goto]").forEach(button => {

    button.onclick = () => {

        showPage(button.dataset.goto);
    };
});


function showPage(id) {

    document.querySelectorAll(".page").forEach(page => {

        page.classList.add("hidden");
    });

    if ($(id)) {

        $(id).classList.remove("hidden");
    }

    document.querySelectorAll(".nav").forEach(nav => {

        nav.classList.toggle(
            "active",
            nav.dataset.page === id
        );
    });

    const names = {

        home: "Home",

        translator: "Voice Translator",

        explain: "Explain Topic",

        homework: "AI Homework",

        history: "Translation History"
    };

    if ($("crumb")) {

        $("crumb").textContent =
            "Teacher Dashboard / " +
            (names[id] || id);
    }

    if (id === "history") {

        loadHistory();
    }
}


// ==================================================
// VOICE TRANSLATOR
// ==================================================


// Demo sentence buttons

document
    .querySelectorAll(".sample-row button")
    .forEach(button => {

        button.onclick = async () => {

            const text = button.dataset.sample;

            if ($("liveText")) {

                $("liveText").textContent = text;
            }

            await translateSegment(text);
        };
    });


// Microphone button

if ($("micBtn")) {

    $("micBtn").onclick = () => {

        const SpeechRecognition =
            window.SpeechRecognition ||
            window.webkitSpeechRecognition;

        if (!SpeechRecognition) {

            toast(
                "Voice recognition ke liye Chrome ya Edge use karo."
            );

            return;
        }


        if (listening) {

            stopListening();

            return;
        }


        recognition = new SpeechRecognition();

        recognition.continuous = true;

        recognition.interimResults = true;


        recognition.lang =
            $("sourceLang").value === "Hindi"
                ? "hi-IN"
                : "en-IN";


        recognition.onstart = () => {

            listening = true;

            $("micBtn").textContent =
                "■ Stop speaking";

            $("micBtn").classList.add(
                "listening"
            );

            if ($("processing")) {

                $("processing").textContent =
                    "LISTENING";
            }
        };


        recognition.onresult = async event => {

            let interim = "";

            let finalTexts = [];


            for (
                let i = event.resultIndex;
                i < event.results.length;
                i++
            ) {

                const text =
                    event.results[i][0]
                        .transcript
                        .trim();


                if (event.results[i].isFinal) {

                    finalTexts.push(text);

                } else {

                    interim += text + " ";
                }
            }


            if (interim && $("liveText")) {

                $("liveText").textContent =
                    interim;
            }


            for (const text of finalTexts) {

                if ($("liveText")) {

                    $("liveText").textContent =
                        text;
                }

                await translateSegment(text);
            }
        };


        recognition.onerror = event => {

            console.log(
                "Speech error:",
                event.error
            );

            toast(
                "Microphone/voice recognition problem."
            );
        };


        recognition.onend = () => {

            if (listening) {

                try {

                    recognition.start();

                } catch { }
            }
        };


        recognition.start();
    };
}


function stopListening() {

    listening = false;

    if (recognition) {

        try {

            recognition.stop();

        } catch { }
    }


    if ($("micBtn")) {

        $("micBtn").textContent =
            "🎙 Start speaking";

        $("micBtn").classList.remove(
            "listening"
        );
    }


    if ($("processing")) {

        $("processing").textContent =
            "READY";
    }
}


if ($("sourceLang")) {

    $("sourceLang").onchange = () => {

        if (listening) {

            stopListening();
        }
    };
}


// ==================================================
// AI TRANSLATION
// ==================================================

async function translateSegment(text) {

    if (!text || !text.trim()) {

        return;
    }


    if ($("processing")) {

        $("processing").textContent =
            "AI TRANSLATING";
    }


    try {

        const data = await api(
            "/api/translate",

            jsonBody({

                text: text,

                source_language:
                    $("sourceLang").value,

                target_language:
                    $("targetLang").value
            })
        );


        if ($("studentLang")) {

            $("studentLang").textContent =
                $("targetLang").value.toUpperCase();
        }


        if ($("studentText")) {

            $("studentText").textContent =
                data.translation ||
                "Translation unavailable";
        }


        if ($("confidence")) {

            $("confidence").textContent =
                (data.confidence || 0) + "%";
        }


        if ($("confidenceBar")) {

            $("confidenceBar").style.width =
                Math.min(
                    100,
                    data.confidence || 0
                ) + "%";
        }


        if ($("route")) {

            $("route").textContent =
                data.route +
                " • " +
                data.mode;
        }


        if ($("processing")) {

            $("processing").textContent =
                "TRANSLATED";
        }


        addLog(data, text);


    } catch (error) {

        console.error(error);

        toast(error.message);

        if ($("processing")) {

            $("processing").textContent =
                "ERROR";
        }
    }
}


// ==================================================
// TRANSLATION LOG
// ==================================================

function addLog(data, input) {

    const log = $("log");

    if (!log) return;


    const row =
        document.createElement("div");

    row.className = "log-item";


    row.innerHTML = `

        <span>
            ${new Date().toLocaleTimeString()}
        </span>

        <b>
            ${escapeHTML(input)}
        </b>

        <b>
            ${escapeHTML(
        data.translation || ""
    )}
        </b>

        <span>
            ${data.confidence || 0}%
        </span>

    `;


    log.prepend(row);


    while (log.children.length > 8) {

        log.lastElementChild.remove();
    }
}


// ==================================================
// SPEAKER
// ==================================================

if ($("speakBtn")) {

    $("speakBtn").onclick = () => {

        const text =
            $("studentText")
                .textContent
                .trim();


        if (!text) {

            toast(
                "Pehle translation generate karo."
            );

            return;
        }


        if (!("speechSynthesis" in window)) {

            toast(
                "Speech output supported nahi hai."
            );

            return;
        }


        const utterance =
            new SpeechSynthesisUtterance(text);


        const target =
            $("targetLang").value;


        utterance.lang =
            target === "Santali"
                ? "sat-IN"
                : "unr-IN";


        const voices =
            speechSynthesis.getVoices();


        const voice =
            voices.find(v =>
                v.lang
                    .toLowerCase()
                    .startsWith(
                        target === "Santali"
                            ? "sat"
                            : "unr"
                    )
            );


        if (voice) {

            utterance.voice = voice;
        }


        utterance.onstart = () => {

            $("speakBtn").textContent =
                "⏸";
        };


        utterance.onend = () => {

            $("speakBtn").textContent =
                "🔊";
        };


        utterance.onerror = () => {

            $("speakBtn").textContent =
                "🔊";

            toast(
                "Is device me " +
                target +
                " speech voice available nahi hai."
            );
        };


        speechSynthesis.cancel();

        speechSynthesis.speak(
            utterance
        );
    };
}


// ==================================================
// AI EXPLAIN
// ==================================================

if ($("explainBtn")) {

    $("explainBtn").onclick = async () => {

        const topic =
            $("explainTopic")
                .value
                .trim();


        if (!topic) {

            toast(
                "Enter a topic first."
            );

            return;
        }


        $("explainBtn").textContent =
            "AI is preparing...";


        try {

            const data = await api(
                "/api/explain",

                jsonBody({

                    topic: topic,

                    language:
                        $("explainLang").value
                })
            );


            $("explainResult").className =
                "result-card";


            $("explainResult").innerHTML = `

                <span class="tag">
                    AI CLASSROOM EXPLANATION
                </span>

                <h3>
                    ${escapeHTML(data.topic)}
                </h3>

                <div class="block">

                    <h4>
                        SIMPLE EXPLANATION
                    </h4>

                    <p>
                        ${escapeHTML(data.simple)}
                    </p>

                </div>

                <div class="block">

                    <h4>
                        KEY POINTS
                    </h4>

                    <ul>

                        ${data.points
                    .map(point =>
                        `<li>
                                    ${escapeHTML(point)}
                                </li>`
                    )
                    .join("")}

                    </ul>

                </div>

                <div class="block">

                    <h4>
                        CLASSROOM ACTIVITY
                    </h4>

                    <p>
                        ${escapeHTML(
                        data.activity
                    )}
                    </p>

                </div>

            `;


        } catch (error) {

            toast(error.message);

        } finally {

            $("explainBtn").textContent =
                "Explain with AI ✦";
        }
    };
}


// ==================================================
// AI HOMEWORK
// ==================================================

if ($("hwBtn")) {

    $("hwBtn").onclick = async () => {

        const topic =
            $("hwTopic")
                .value
                .trim();


        if (!topic) {

            toast(
                "Enter a topic first."
            );

            return;
        }


        $("hwBtn").textContent =
            "Generating...";


        try {

            const data = await api(
                "/api/homework",

                jsonBody({

                    topic: topic,

                    grade:
                        $("hwGrade").value,

                    language:
                        $("hwLang").value,

                    count:
                        Number(
                            $("hwCount").value
                        )
                })
            );


            $("hwResult").className =
                "result-card";


            $("hwResult").innerHTML = `

                <span class="tag">
                    AI HOMEWORK
                </span>

                <h3>
                    ${escapeHTML(data.topic)}
                </h3>

                <div class="block">

                    <h4>
                        QUESTIONS
                    </h4>

                    <ol>

                        ${data.questions
                    .map(q =>
                        `<li>
                                    ${escapeHTML(q)}
                                </li>`
                    )
                    .join("")}

                    </ol>

                </div>

            `;


        } catch (error) {

            toast(error.message);

        } finally {

            $("hwBtn").textContent =
                "Generate Homework ✦";
        }
    };
}


// ==================================================
// HISTORY
// ==================================================

async function loadHistory() {

    try {

        const rows =
            await api("/api/history");


        const box =
            $("historyTable");


        if (!rows.length) {

            box.innerHTML =
                `<div class="empty-history">
                    No translation activity yet.
                </div>`;

            return;
        }


        box.innerHTML = `

            <div class="history-row head">

                <span>TIME</span>
                <span>FROM</span>
                <span>TO</span>
                <span>INPUT</span>
                <span>OUTPUT</span>
                <span>MATCH</span>

            </div>

            ${rows.map(row => `

                    <div class="history-row">

                        <span>
                            ${escapeHTML(row.time)}
                        </span>

                        <span>
                            ${escapeHTML(row.source)}
                        </span>

                        <span>
                            ${escapeHTML(row.target)}
                        </span>

                        <b>
                            ${escapeHTML(row.input)}
                        </b>

                        <b>
                            ${escapeHTML(row.output)}
                        </b>

                        <span>
                            ${row.confidence}%
                        </span>

                    </div>

                `).join("")
            }

        `;

    } catch (error) {

        toast(error.message);
    }
}


// ==================================================
// SECURITY
// ==================================================

function escapeHTML(value) {

    return String(value)
        .replace(
            /[&<>"']/g,
            char => ({

                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"

            }[char])
        );
}


// ==================================================
// BACKEND CHECK
// ==================================================

(async () => {

    try {

        const health =
            await api("/api/health");

        console.log(
            "BhashaSetu AI:",
            health
        );

    } catch {

        toast(
            "FastAPI backend start karo."
        );
    }

})();