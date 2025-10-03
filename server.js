const express = require("express");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const PDFDocument = require("pdfkit");
const cors = require("cors");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// ⚠️ Mets ici ton email pro + config SMTP
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",   // exemple Gmail
  port: 587,
  secure: false,
  auth: {
    user: "ton.email@gmail.com",
    pass: "motdepasse_application", // pas ton mot de passe normal, mais un mot de passe d’application
  },
});

// Génération PDF
function generatePDF(data, path) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const stream = fs.createWriteStream(path);
    doc.pipe(stream);

    doc.fontSize(20).text("Récapitulatif - MonCoffretElec", { align: "center" });
    doc.moveDown();

    doc.fontSize(12).text(`Adresse: ${data.address || "—"}`);
    doc.text(`Tension: ${data.tension || "—"}`);
    doc.text(`Plans: ${data.wantsPlans ? `${data.files.length} fichier(s)` : "Non demandé"}`);
    doc.text(`Pièces: ${data.rooms.length > 0 ? data.rooms.join(", ") : "—"}`);
    doc.text(`Appareils: ${data.appliances.length > 0 ? data.appliances.join(", ") : "—"}`);
    doc.text(`Email client: ${data.email || "—"}`);
    doc.moveDown().text("Notes:");
    doc.text(data.notes || "—", { width: 450 });

    doc.end();
    stream.on("finish", () => resolve(path));
    stream.on("error", reject);
  });
}

// Endpoint API
app.post("/send", async (req, res) => {
  try {
    const data = req.body;
    const pdfPath = "./recap.pdf";
    await generatePDF(data, pdfPath);

    // Email au client
    await transporter.sendMail({
      from: '"MonCoffretElec" <ton.email@gmail.com>',
      to: data.email,
      subject: "Votre récapitulatif MonCoffretElec",
      text: "Voici le récapitulatif de votre demande.",
      attachments: [{ filename: "recap.pdf", path: pdfPath }],
    });

    // Email pour toi
    await transporter.sendMail({
      from: '"MonCoffretElec" <ton.email@gmail.com>',
      to: "ton.email@gmail.com", // ton adresse pro
      subject: "Nouvelle demande client - MonCoffretElec",
      text: "Voici la demande client reçue.",
      attachments: [{ filename: "recap.pdf", path: pdfPath }],
    });

    res.json({ success: true, message: "Emails envoyés avec succès !" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Erreur envoi email" });
  }
});

// Lancer le serveur
const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 Serveur backend sur http://localhost:${PORT}`));
