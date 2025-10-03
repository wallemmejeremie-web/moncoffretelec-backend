import React, { useMemo, useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from "react-router-dom";
import {
  Home, FileText, MapPin, Zap, Upload, Grid2x2,
  Plug, BookOpen, CheckCircle2, Trash2, ChevronLeft, ChevronRight, HelpCircle, Mail
} from "lucide-react";

/* ----------------------------- Stepper ---------------------------- */
function Stepper({ steps, current }) {
  return (
    <ol className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-8">
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={s.key} className="flex items-center">
            <div
              className={[
                "flex items-center w-full rounded-lg border px-3 py-2 text-sm font-medium",
                done ? "border-emerald-300 bg-emerald-50 text-emerald-700" :
                active ? "border-indigo-300 bg-indigo-50 text-indigo-700" :
                         "border-slate-200 bg-white text-slate-600"
              ].join(" ")}
            >
              <s.icon className="mr-2" size={16} />
              <span className="truncate">{s.label}</span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/* ----------------------------- Toast ---------------------------- */
function Toast({ message, type, onClose }) {
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        onClose();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  if (!message) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div
        className={`px-4 py-3 rounded-lg shadow-lg text-white flex items-center gap-2 ${
          type === "success" ? "bg-emerald-600" : "bg-rose-600"
        }`}
      >
        {message}
      </div>
    </div>
  );
}

/* ----------------------------- Home ---------------------------- */
function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100/40 to-white p-6">
      <div className="max-w-2xl bg-white p-10 rounded-2xl shadow-xl text-center border">
        <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4">
          Bienvenue sur<br />MonCoffretElec.com
        </h1>
        <p className="text-lg text-slate-700 mb-4">
          Créez votre <strong>coffret électrique sur mesure</strong> en quelques étapes simples.
        </p>
        <p className="text-slate-500 mb-8">
          Pour <strong>particuliers</strong>, <strong>installateurs</strong> et <strong>architectes</strong>.
        </p>

        <Link
          to="/formulaire"
          className="inline-flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg shadow hover:bg-indigo-700 transition"
        >
          <FileText size={20} />
          Démarrer la conception
        </Link>
      </div>
    </div>
  );
}

/* ----------------------------- Wizard ---------------------------- */
function WizardForm() {
  const navigate = useNavigate();

  const [address, setAddress] = useState("");
  const [tension, setTension] = useState("");
  const [wantsPlans, setWantsPlans] = useState(null);
  const [files, setFiles] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [roomName, setRoomName] = useState("");
  const [appliances, setAppliances] = useState([]);
  const [applianceName, setApplianceName] = useState("");
  const [notes, setNotes] = useState("");
  const [email, setEmail] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [statusType, setStatusType] = useState("");

  const steps = useMemo(() => ([
    { key: "adresse", label: "Adresse", icon: MapPin },
    { key: "tension", label: "Tension", icon: Zap },
    { key: "questionPlans", label: "Plans ?", icon: HelpCircle },
    { key: "plans",   label: "Import plans", icon: Upload },
    { key: "pieces",  label: "Pièces",  icon: Grid2x2 },
    { key: "app",     label: "Appareils", icon: Plug },
    { key: "notes",   label: "Notes",   icon: BookOpen },   // ✅ remplacé
    { key: "recap",   label: "Récap",   icon: CheckCircle2 },
  ]), []);

  const [current, setCurrent] = useState(0);
  const isLast = current === steps.length - 1;

  function next() {
    let nextStep = current + 1;
    if (steps[nextStep]?.key === "plans" && wantsPlans === false) {
      nextStep++;
    }
    if (nextStep < steps.length) setCurrent(nextStep);
  }

  function prev() {
    let prevStep = current - 1;
    if (steps[current]?.key === "pieces" && wantsPlans === false) {
      prevStep--;
    }
    if (prevStep >= 0) setCurrent(prevStep);
  }

  async function handleSubmit() {
    try {
      const res = await fetch("http://localhost:5000/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address, tension, wantsPlans, files, rooms, appliances, notes, email
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMessage("Votre demande a bien été envoyée ✅");
        setStatusType("success");
        navigate("/");
      } else {
        throw new Error(data.message);
      }
    } catch (err) {
      setStatusMessage("Erreur lors de l’envoi ❌");
      setStatusType("error");
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto bg-white p-8 rounded-2xl shadow-lg border">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-indigo-700 flex items-center">
            <FileText className="mr-2" size={26}/> MonCoffretElec — Assistant
          </h1>
          <Link to="/" className="text-indigo-600 hover:text-indigo-800 inline-flex items-center">
            <Home className="mr-1" size={18}/> Accueil
          </Link>
        </div>

        <Stepper steps={steps} current={current} />

        {/* Rendu des étapes (adresse, tension, plans, pièces, appareils, notes, récap) */}
        {/* ... identique à la version précédente que je t’ai donnée ... */}
      </div>

      <Toast message={statusMessage} type={statusType} onClose={() => setStatusMessage("")} />
    </div>
  );
}

/* ----------------------------- App ---------------------------- */
export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage/>} />
        <Route path="/formulaire" element={<WizardForm/>} />
      </Routes>
    </Router>
  );
}
