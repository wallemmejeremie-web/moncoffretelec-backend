// server.cjs
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const PDFDocument = require("pdfkit");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors());
app.use(bodyParser.json());

const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const MY_PRO_EMAIL = process.env.MY_PRO_EMAIL || SMTP_USER;

if (!SMTP_USER || !SMTP_PASS) {
  console.warn("⚠️  SMTP_USER or SMTP_PASS not set in .env");
}

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: SMTP_USER, pass: SMTP_PASS },
});

/* ------------------ PDF Stylisé avec Noto Sans ------------------ */
function generatePDF(data, outPath) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40 });
    const stream = fs.createWriteStream(outPath);
    doc.pipe(stream);

    // Charger police UTF-8 (Noto Sans)
    const fontPath = path.join(__dirname, "fonts", "NotoSans-Regular.ttf");
    if (fs.existsSync(fontPath)) {
      doc.registerFont("Body", fontPath);
      doc.font("Body");
      console.log("✅ Police Noto Sans chargée :", fontPath);
    } else {
      console.warn("⚠️ Police non trouvée :", fontPath);
    }

    // LOGO + HEADER
    const logoPath = path.join(__dirname, "logo.png");
    if (fs.existsSync(logoPath)) {
      try {
        doc.image(logoPath, 40, 30, { width: 60 });
        console.log("✅ Logo inséré depuis :", logoPath);
      } catch (e) {
        console.error("⚠️ Impossible de charger le logo:", e.message);
        doc.font("Body").fontSize(12).fillColor("red").text("Logo manquant", 40, 40);
      }
    } else {
      console.warn("⚠️ Logo non trouvé :", logoPath);
      doc.font("Body").fontSize(12).fillColor("red").text("Logo manquant", 40, 40);
    }

    doc
      .font("Body")
      .fontSize(22)
      .fillColor("#1E3A8A")
      .text("Récapitulatif - MonCoffretElec", 110, 40);

    doc.moveDown(2);
    doc.moveTo(40, 100).lineTo(550, 100).stroke("#1E3A8A");
    doc.moveDown(2).font("Body").fontSize(12).fillColor("black");

    // Sections simples
    const sections = [
      { label: "Adresse", value: data.address },
      { label: "Tension", value: data.tension },
      { label: "Plans", value: data.wantsPlans ? `${(data.files || []).length} fichier(s)` : "Non demandé" },
    ];

    sections.forEach((s) => {
      doc.font("Body").fontSize(14).fillColor("#1E3A8A").text(s.label, { underline: true });
      doc.font("Body").fillColor("black").text(s.value || "—");
      doc.moveDown();
    });

    // Pièces
    doc.font("Body").fontSize(14).fillColor("#1E3A8A").text("Pièces", { underline: true });
    if (data.rooms && data.rooms.length) {
      data.rooms.forEach((r) => doc.font("Body").fillColor("black").text("- " + r));
    } else {
      doc.font("Body").fillColor("black").text("—");
    }
    doc.moveDown();

    // Appareils
    doc.font("Body").fontSize(14).fillColor("#1E3A8A").text("Appareils", { underline: true });
    if (data.appliances && data.appliances.length) {
      data.appliances.forEach((a) => doc.font("Body").fillColor("black").text("- " + a));
    } else {
      doc.font("Body").fillColor("black").text("—");
    }
    doc.moveDown();

    // Notes
    doc.font("Body").fontSize(14).fillColor("#1E3A8A").text("Notes", { underline: true });
    doc.font("Body").fillColor("black").text(data.notes || "—", { width: 500 });
    doc.moveDown();

    // Email
    doc.font("Body").fontSize(14).fillColor("#1E3A8A").text("Email du client", { underline: true });
    doc.font("Body").fillColor("black").text(data.email || "—");
    doc.moveDown();

    // Footer
    doc.font("Body").fontSize(10).fillColor("gray")
      .text("MonCoffretElec - Document généré automatiquement", 40, 760, { align: "center", width: 520 })
      .text("Établi par Electrical Designer", 40, 775, { align: "center", width: 520 });

    doc.end();
    stream.on("finish", () => resolve(outPath));
    stream.on("error", (err) => reject(err));
  });
}

/* ------------------ API ------------------ */
app.get("/", (req, res) => res.send("Backend MonCoffretElec OK"));

app.post("/send", async (req, res) => {
  try {
    const payload = req.body;
    if (!payload.email) {
      return res.status(400).json({ success: false, message: "Email client requis" });
    }

    const outFilename = `recap-${Date.now()}.pdf`;
    const outPath = path.join(__dirname, outFilename);

    await generatePDF(payload, outPath);

    // Email au client
    await transporter.sendMail({
      from: `"MonCoffretElec" <${SMTP_USER}>`,
      to: payload.email,
      subject: "Votre récapitulatif MonCoffretElec",
      text: "Veuillez trouver en pièce jointe le récapitulatif de votre demande.",
      attachments: [{ filename: "recap.pdf", path: outPath }],
    });

    // Email pro
    await transporter.sendMail({
      from: `"MonCoffretElec" <${SMTP_USER}>`,
      to: MY_PRO_EMAIL,
      subject: "Nouvelle demande client - MonCoffretElec",
      text: `Nouvelle demande reçue de ${payload.email}.`,
      attachments: [{ filename: "recap.pdf", path: outPath }],
    });

    fs.unlink(outPath, () => {});
    res.json({ success: true, message: "Emails envoyés avec succès !" });
  } catch (err) {
    console.error("Erreur envoi :", err);
    res.status(500).json({ success: false, message: "Erreur envoi email" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Serveur backend sur http://localhost:${PORT}`));
