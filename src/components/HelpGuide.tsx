"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import styles from "./HelpGuide.module.css";
import { useI18n } from "@/lib/i18n";

export default function HelpGuide() {
  const { t, language } = useI18n();
  const [activeTab, setActiveTab] = useState<"album" | "trade" | "group" | "security">("album");

  // Interactive mock quantities state
  const [mockQty, setMockQty] = useState(0);
  const [mockSpecialQty, setMockSpecialQty] = useState(0);
  
  // Interaction feedback states
  const [feedback, setFeedback] = useState("");

  // Mobile long-press timer ref
  const touchTimerRef = useRef<any>(null);
  const longPressActiveRef = useRef(false);

  const clearFeedbackTimer = useRef<any>(null);

  const triggerFeedback = (msg: string) => {
    setFeedback(msg);
    if (clearFeedbackTimer.current) clearTimeout(clearFeedbackTimer.current);
    clearFeedbackTimer.current = setTimeout(() => setFeedback(""), 3000);
  };

  // Sticker action handler (Add)
  const handleStickerClick = (type: "normal" | "special") => {
    if (longPressActiveRef.current) {
      longPressActiveRef.current = false;
      return;
    }

    if (type === "normal") {
      setMockQty((prev) => prev + 1);
      triggerFeedback(language === "es" ? "¡MEX 1 agregado! (+1)" : "MEX 1 added! (+1)");
    } else {
      setMockSpecialQty((prev) => prev + 1);
      triggerFeedback(language === "es" ? "¡FWC 8 agregado! (+1)" : "FWC 8 added! (+1)");
    }
  };

  // Sticker action handler (Remove)
  const handleStickerRemove = (type: "normal" | "special") => {
    if (type === "normal") {
      setMockQty((prev) => {
        if (prev <= 0) return 0;
        triggerFeedback(language === "es" ? "MEX 1 decrementado (-1)" : "MEX 1 decremented (-1)");
        return prev - 1;
      });
    } else {
      setMockSpecialQty((prev) => {
        if (prev <= 0) return 0;
        triggerFeedback(language === "es" ? "FWC 8 decrementado (-1)" : "FWC 8 decremented (-1)");
        return prev - 1;
      });
    }
  };

  // Right click handler
  const handleContextMenu = (e: React.MouseEvent, type: "normal" | "special") => {
    e.preventDefault();
    handleStickerRemove(type);
  };

  // Mobile Touch Gestures
  const handleTouchStart = (type: "normal" | "special") => {
    longPressActiveRef.current = false;
    touchTimerRef.current = setTimeout(() => {
      longPressActiveRef.current = true;
      handleStickerRemove(type);
    }, 500); // 500ms long press threshold
  };

  const handleTouchEnd = () => {
    if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
  };



  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
      if (clearFeedbackTimer.current) clearTimeout(clearFeedbackTimer.current);
    };
  }, []);

  // Multi-language strings for help content
  const content = {
    es: {
      title: "Centro de Ayuda y Soporte",
      description: "Descubre cómo coleccionar, intercambiar con amigos y colaborar con tu grupo familiar en tiempo real.",
      tabAlbum: "📖 Álbum",
      tabTrade: "🔄 Intercambios",
      tabGroup: "👨‍👩‍👧‍👦 Grupo Familiar",
      tabSecurity: "🛡️ Seguridad",
      
      albumTitle: "Cómo gestionar tu Álbum",
      albumIntro: "El álbum principal te permite registrar el estado de cada cromo del Mundial 2026 de forma interactiva.",
      
      step1Title: "1. Añadir Cromos",
      step1Desc: "Toca o haz clic en un cromo para marcarlo como conseguido.",
      
      step2Title: "2. Repetidos (Duplicados)",
      step2Desc: "Sigue tocando el mismo cromo para añadir repetidos. Aparecerá un globo rojo con la cantidad (ej. +1, +2).",
      
      step3Title: "3. Quitar / Restar",
      step3Desc: "Mantén presionado o haz clic derecho sobre el cromo para restar cantidad.",
      
      step4Title: "4. Carga en Lote (Lote Rápido)",
      step4Desc: "Usa el cuadro de texto 'Carga rápida' para agregar muchos códigos separados por comas al mismo tiempo.",

      tradeTitle: "Intercambios Inteligentes con QR y Chat",
      tradeIntro: "AlbumHelper calcula automáticamente las coincidencias entre tus repetidos y los cromos que le faltan a tus amigos.",
      
      tradeStep1Title: "1. Tu Código QR",
      tradeStep1Desc: "En la sección 'Intercambiar', verás tu código QR que contiene el listado comprimido de tus cromos repetidos.",
      
      tradeStep2Title: "2. Escanear a un Amigo",
      tradeStep2Desc: "Usa el 'Escáner de Intercambio' (cámara) para escanear el QR de tu amigo. La app te dirá qué cromos de él te faltan.",
      
      tradeStep3Title: "3. Pegar Lista de Chat",
      tradeStep3Desc: "¿Están chateando? Dile que te envíe su lista, pégala en el cuadro de texto y haz clic en 'Comparar Lista'.",

      groupTitle: "Colaboración en Grupo Familiar",
      groupIntro: "Sincroniza tu álbum en tiempo real con otros miembros de tu hogar usando una misma base de datos.",
      
      groupStep1Title: "1. Crear un Grupo",
      groupStep1Desc: "Ve a Ajustes, ingresa un nombre en 'Crear un Nuevo Grupo' y obtén tu código exclusivo.",
      
      groupStep2Title: "2. Compartir Código",
      groupStep2Desc: "Envía el código de invitación (ej: FAM123) o escribe su correo electrónico para que se unan.",
      
      groupStep3Title: "3. Sincronización Real",
      groupStep3Desc: "Cualquier cromo añadido por ti o tu familia actualizará el total inmediatamente para todos en casa.",

      securityTitle: "Seguridad y Doble Factor",
      securityIntro: "Mantén segura tu colección configurando métodos modernos de inicio de sesión.",
      
      securityStep1Title: "1. Doble Factor (2FA)",
      securityStep1Desc: "Activa 2FA en Ajustes, escanea el QR con Google Authenticator y asegura tu cuenta con un código dinámico.",
      
      securityStep2Title: "2. Llaves de Paso (Passkeys)",
      securityStep2Desc: "Registra tu biometría (FaceID, Huella o PIN). Inicia sesión sin contraseña de manera instantánea y segura.",
      
      securityStep3Title: "3. Códigos de Recuperación",
      securityStep3Desc: "Descarga o envía por correo tus códigos de un solo uso para no perder acceso si pierdes tu celular.",
      
      backToAlbum: "Volver al Álbum",
      interactiveTip: "¡Prueba interactuando con los cromos de prueba!",
      quickPasteEx: "Ejemplo de pegado rápido de cromos:",
      aboutRaskitoma: "Desarrollado con pasión para coleccionistas. © 2026 Raskitoma.io"
    },
    en: {
      title: "Help & Support Center",
      description: "Discover how to collect, trade with friends, and collaborate with your family group in real time.",
      tabAlbum: "📖 Album",
      tabTrade: "🔄 Trades",
      tabGroup: "👨‍👩‍👧‍👦 Family Group",
      tabSecurity: "🛡️ Security",
      
      albumTitle: "How to manage your Album",
      albumIntro: "The main album page allows you to interactively log the collection status of every 2026 World Cup sticker.",
      
      step1Title: "1. Add Stickers",
      step1Desc: "Tap or click on a sticker to mark it as collected.",
      
      step2Title: "2. Duplicates (Swaps)",
      step2Desc: "Keep tapping the same sticker to add duplicates. A red tag with the count will appear (e.g. +1, +2).",
      
      step3Title: "3. Remove / Subtract",
      step3Desc: "Long press or right-click over the sticker to decrease its count.",
      
      step4Title: "4. Bulk Quick-Add",
      step4Desc: "Use the 'Bulk quick-add' input box to load many sticker codes separated by commas at once.",

      tradeTitle: "Smart Trading with QR & Chat Lists",
      tradeIntro: "AlbumHelper automatically matches your duplicates list against the stickers your friends are missing.",
      
      tradeStep1Title: "1. Your QR Code",
      tradeStep1Desc: "Under the 'Trade' section, you'll see your QR code which holds a compressed list of your duplicate stickers.",
      
      tradeStep2Title: "2. Scan a Friend",
      tradeStep2Desc: "Use the 'Trade Scanner' (camera) to scan your friend's QR. The app shows which of their duplicates you need.",
      
      tradeStep3Title: "3. Paste Chat List",
      tradeStep3Desc: "Chatting online? Paste the duplicates list sent by your friend into the comparison box and hit 'Compare List'.",

      groupTitle: "Family Group Collaboration",
      groupIntro: "Sync your album database in real-time across your household members.",
      
      groupStep1Title: "1. Create a Group",
      groupStep1Desc: "Go to Settings, enter a name in 'Create a New Group', and generate your exclusive code.",
      
      groupStep2Title: "2. Share Group Code",
      groupStep2Desc: "Send the invitation code (e.g. FAM123) or enter their email address to invite them to join.",
      
      groupStep3Title: "3. Real-Time Sync",
      groupStep3Desc: "Any sticker added by you or your family members instantly updates the collection status for everyone.",

      securityTitle: "Account Security & 2FA",
      securityIntro: "Secure your collection database by setting up modern verification and login methods.",
      
      securityStep1Title: "1. Two-Factor (2FA)",
      securityStep1Desc: "Enable 2FA in Settings, scan the QR with Google Authenticator, and log in with a dynamic code.",
      
      securityStep2Title: "2. Passkeys (Biometrics)",
      securityStep2Desc: "Register your device's biometrics (FaceID, fingerprint, or PIN) to log in instantly without passwords.",
      
      securityStep3Title: "3. Recovery Codes",
      securityStep3Desc: "Download or email your one-time recovery codes to prevent lockout if you lose your mobile device.",
      
      backToAlbum: "Back to Album",
      interactiveTip: "Try it out by interacting with these test stickers!",
      quickPasteEx: "Example of bulk quick-add format:",
      aboutRaskitoma: "Developed with passion for collectors. © 2026 Raskitoma.io"
    },
    it: {
      title: "Centro Assistenza e Supporto",
      description: "Scopri come collezionare, scambiare con gli amici e collaborare con il tuo gruppo familiare in tempo reale.",
      tabAlbum: "📖 Album",
      tabTrade: "🔄 Scambi",
      tabGroup: "👨‍👩‍👧‍👦 Gruppo Familiare",
      tabSecurity: "🛡️ Sicurezza",
      
      albumTitle: "Come gestire il tuo Album",
      albumIntro: "L'album principale ti consente di registrare lo stato di ogni figurina del Mondiale 2026 in modo interattivo.",
      
      step1Title: "1. Aggiungi Figurine",
      step1Desc: "Tocca o fai clic su una figurina per contrassegnarla come ottenuta.",
      
      step2Title: "2. Figurine Doppie",
      step2Desc: "Continua a toccare la stessa figurina per aggiungere doppie. Apparirà un badge rosso con la quantità (es. +1, +2).",
      
      step3Title: "3. Rimuovi / Sottrai",
      step3Desc: "Tieni premuto o fai clic destro sulla figurina per diminuire il conteggio.",
      
      step4Title: "4. Caricamento Rapido",
      step4Desc: "Utilizza la casella 'Caricamento rapido' per inserire molti codici separati da virgole contemporaneamente.",

      tradeTitle: "Scambi Intelligenti con QR e Chat",
      tradeIntro: "AlbumHelper calcola automaticamente le corrispondenze tra i tuoi doppioni e le figurine mancanti dei tuoi amici.",
      
      tradeStep1Title: "1. Il Tuo Codice QR",
      tradeStep1Desc: "Nella sezione 'Scambia', vedrai il tuo codice QR che contiene l'elenco compresso delle tue doppie.",
      
      tradeStep2Title: "2. Scansiona un Amico",
      tradeStep2Desc: "Usa lo 'Scanner di Scambio' (fotocamera) per scansionare il QR del tuo amico. L'app ti dirà quali sue doppie ti mancano.",
      
      tradeStep3Title: "3. Incolla Lista da Chat",
      tradeStep3Desc: "State chattando? Chiedigli di inviarti la sua lista, incollala nella casella e fai clic su 'Confronta Lista'.",

      groupTitle: "Collaborazione Gruppo Familiare",
      groupIntro: "Sincronizza il tuo album in tempo reale con altri membri della tua famiglia utilizzando lo stesso database.",
      
      groupStep1Title: "1. Crea un Gruppo",
      groupStep1Desc: "Vai su Impostazioni, inserisci un nome in 'Crea un Nuovo Gruppo' e ottieni il tuo codice esclusivo.",
      
      groupStep2Title: "2. Condividi il Codice",
      groupStep2Desc: "Invia il codice di invito (es: FAM123) o inserisci l'indirizzo email per invitare altri membri.",
      
      groupStep3Title: "3. Sincronizzazione in Tempo Reale",
      groupStep3Desc: "Qualsiasi figurina aggiunta da te o dalla tua famiglia aggiornerà immediatamente il totale per tutti a casa.",

      securityTitle: "Sicurezza e Doppia Autenticazione",
      securityIntro: "Proteggi la tua collezione configurando metodi moderni di accesso protetto.",
      
      securityStep1Title: "1. Doppio Fattore (2FA)",
      securityStep1Desc: "Attiva la 2FA in Impostazioni, scansiona il QR con Google Authenticator e accedi con un codice dinamico.",
      
      securityStep2Title: "2. Passkey (Biometria)",
      securityStep2Desc: "Registra la tua biometria (FaceID, Impronta o PIN). Accedi all'istante in modo sicuro senza password.",
      
      securityStep3Title: "3. Codici di Recupero",
      securityStep3Desc: "Scarica o invia via email i tuoi codici monouso per non perdere l'accesso se perdi lo smartphone.",
      
      backToAlbum: "Torna all'Album",
      interactiveTip: "Prova a interagire con le figurine di prova!",
      quickPasteEx: "Esempio di caricamento rapido:",
      aboutRaskitoma: "Sviluppato con passione per i collezionisti. © 2026 Raskitoma.io"
    },
    pt: {
      title: "Centro de Ajuda e Suporte",
      description: "Descubra como colecionar, trocar com amigos e colaborar com seu grupo familiar em tempo real.",
      tabAlbum: "📖 Álbum",
      tabTrade: "🔄 Trocas",
      tabGroup: "👨‍👩‍👧‍👦 Grupo Familiar",
      tabSecurity: "🛡️ Segurança",
      
      albumTitle: "Como gerenciar seu Álbum",
      albumIntro: "O álbum principal permite que você registre o status de cada cromo da Copa 2026 de forma interativa.",
      
      step1Title: "1. Adicionar Cromos",
      step1Desc: "Toque ou clique em um cromo para marcá-lo como obtido.",
      
      step2Title: "2. Cromos Repetidos",
      step2Desc: "Continue tocando no mesmo cromo para adicionar repetidos. Aparecerá um balão vermelho com a quantidade (ex. +1, +2).",
      
      step3Title: "3. Remover / Subtrair",
      step3Desc: "Mantenha pressionado ou clique com o botão direito sobre o cromo para subtrair.",
      
      step4Title: "4. Carga Rápida em Lote",
      step4Desc: "Use a caixa de texto 'Carga rápida' para adicionar muitos códigos separados por vírgulas ao mesmo tempo.",

      tradeTitle: "Trocas Inteligentes com QR e Chat",
      tradeIntro: "O AlbumHelper calcula automaticamente as correspondências entre suas repetidas e os cromos que faltam para seus amigos.",
      
      tradeStep1Title: "1. Seu Código QR",
      tradeStep1Desc: "Na seção 'Trocar', você verá seu código QR que contém a lista compactada dos seus cromos repetidos.",
      
      tradeStep2Title: "2. Escanear um Amigo",
      tradeStep2Desc: "Use o 'Scanner de Troca' (câmera) para escanear o QR do seu amigo. O app dirá quais cromos dele você precisa.",
      
      tradeStep3Title: "3. Colar Lista de Chat",
      tradeStep3Desc: "Estão conversando? Peça para ele enviar a lista dele, cole na caixa de texto e clique em 'Comparar Lista'.",

      groupTitle: "Colaboração em Grupo Familiar",
      groupIntro: "Sincronize seu álbum em tempo real com outros membros da sua casa usando o mesmo banco de dados.",
      
      groupStep1Title: "1. Criar um Grupo",
      groupStep1Desc: "Vá em Ajustes, digite um nome em 'Criar um Novo Grupo' e gere o seu código exclusivo.",
      
      groupStep2Title: "2. Compartilhar Código",
      groupStep2Desc: "Envie o código de convite (ex: FAM123) ou insira o e-mail deles para convidá-los a participar.",
      
      groupStep3Title: "3. Sincronização em Tempo Real",
      groupStep3Desc: "Qualquer cromo adicionado por você ou sua família atualizará o total imediatamente para todos em casa.",

      securityTitle: "Segurança e Autenticação de Dois Fatores",
      securityIntro: "Mantenha sua coleção segura configurando métodos modernos de login seguro.",
      
      securityStep1Title: "1. Duplo Fator (2FA)",
      securityStep1Desc: "Ative o 2FA em Ajustes, escaneie o QR com o Google Authenticator e proteja sua conta com códigos dinâmicos.",
      
      securityStep2Title: "2. Chaves de Acesso (Passkeys)",
      securityStep2Desc: "Registre a biometria do seu aparelho (FaceID, Digital ou PIN). Faça login instantâneo sem precisar de senhas.",
      
      securityStep3Title: "3. Códigos de Recuperação",
      securityStep3Desc: "Baixe ou envie por e-mail seus códigos descartáveis para não perder o acesso caso perca o celular.",
      
      backToAlbum: "Voltar ao Álbum",
      interactiveTip: "Teste interagindo com os cromos de teste!",
      quickPasteEx: "Exemplo de carga rápida em lote:",
      aboutRaskitoma: "Desenvolvido com paixão para colecionadores. © 2026 Raskitoma.io"
    },
    fr: {
      title: "Centre d'Aide & Support",
      description: "Découvrez comment collectionner, échanger avec vos amis et collaborer en temps réel avec votre groupe familial.",
      tabAlbum: "📖 Album",
      tabTrade: "🔄 Échanges",
      tabGroup: "👨‍👩‍👧‍👦 Groupe Familial",
      tabSecurity: "🛡️ Sécurité",
      
      albumTitle: "Comment gérer votre Album",
      albumIntro: "L'album principal vous permet de consigner de manière interactive l'état de votre collection de stickers Coupe du Monde 2026.",
      
      step1Title: "1. Ajouter des Stickers",
      step1Desc: "Appuyez ou cliquez sur un sticker pour le marquer comme collectionné.",
      
      step2Title: "2. Stickers en Double",
      step2Desc: "Continuez d'appuyer sur le même sticker pour ajouter des doubles. Un badge rouge affichera la quantité (ex. +1, +2).",
      
      step3Title: "3. Retirer / Soustraire",
      step3Desc: "Maintenez appuyé ou faites un clic droit sur le sticker pour soustraire.",
      
      step4Title: "4. Ajout Rapide en Lot",
      step4Desc: "Utilisez la zone de texte 'Ajout rapide' pour charger de nombreux codes séparés par des virgules en une seule fois.",

      tradeTitle: "Échanges Intelligents par QR et Chat",
      tradeIntro: "AlbumHelper calcule automatiquement les correspondances entre vos doubles et les stickers manquants de vos amis.",
      
      tradeStep1Title: "1. Votre Code QR",
      tradeStep1Desc: "Dans la section 'Échanger', vous trouverez votre QR code contenant la liste compressée de vos stickers en double.",
      
      tradeStep2Title: "2. Scanner un Ami",
      tradeStep2Desc: "Utilisez le 'Scanner d'Échange' (caméra) pour scanner le QR de votre ami. L'app indique quels doubles vous pouvez recevoir.",
      
      tradeStep3Title: "3. Coller une Liste Chat",
      tradeStep3Desc: "Vous discutez par message? Demandez sa liste, collez-la dans la zone de texte et cliquez sur 'Comparer la Liste'.",

      groupTitle: "Collaboration en Groupe Familial",
      groupIntro: "Synchronisez votre album en temps réel avec les membres de votre foyer sur une base de données partagée.",
      
      groupStep1Title: "1. Créer un Groupe",
      groupStep1Desc: "Allez dans Paramètres, entrez un nom dans 'Créer un Nouveau Groupe' et générez votre code exclusif.",
      
      groupStep2Title: "2. Partager le Code",
      groupStep2Desc: "Envoyez le code d'invitation (ex: FAM123) ou entrez leur adresse e-mail pour qu'ils rejoignent l'album.",
      
      groupStep3Title: "3. Synchronisation Totale",
      groupStep3Desc: "Chaque sticker ajouté par vous ou votre famille met instantanément à jour le total pour tout le monde.",

      securityTitle: "Sécurité de Compte et 2FA",
      securityIntro: "Sécurisez l'accès à votre collection en configurant des méthodes de validation modernes.",
      
      securityStep1Title: "1. Double Facteur (2FA)",
      securityStep1Desc: "Activez la 2FA dans Paramètres, scannez le QR avec Google Authenticator et connectez-vous avec un code dynamique.",
      
      securityStep2Title: "2. Clés de Passe (Passkeys)",
      securityStep2Desc: "Enregistrez la biométrie de votre appareil (FaceID, empreinte ou PIN) pour vous connecter sans mot de passe.",
      
      securityStep3Title: "3. Codes de Secours",
      securityStep3Desc: "Téléchargez ou envoyez par e-mail vos codes à usage unique pour éviter le blocage si vous perdez votre téléphone.",
      
      backToAlbum: "Retour à l'Album",
      interactiveTip: "Essayez en interagissant avec ces stickers de test !",
      quickPasteEx: "Exemple d'ajout rapide en lot :",
      aboutRaskitoma: "Développé avec passion pour les collectionneurs. © 2026 Raskitoma.io"
    }
  };

  // Select strings for current language (default to English if not found)
  const l = content[language] || content.en;

  return (
    <div className={styles.container}>
      {/* 1. Gorgeous Title Bar */}
      <div className={styles.headerCard}>
        <h1 className={styles.headerTitle}>{l.title}</h1>
        <p className={styles.headerDesc}>{l.description}</p>
      </div>

      {/* 2. Glassmorphic Navigation Tabs */}
      <div className={styles.tabsContainer}>
        <button
          onClick={() => setActiveTab("album")}
          className={`${styles.tabBtn} ${activeTab === "album" ? styles.tabBtnActive : ""}`}
        >
          {l.tabAlbum}
        </button>
        <button
          onClick={() => setActiveTab("trade")}
          className={`${styles.tabBtn} ${activeTab === "trade" ? styles.tabBtnActive : ""}`}
        >
          {l.tabTrade}
        </button>
        <button
          onClick={() => setActiveTab("group")}
          className={`${styles.tabBtn} ${activeTab === "group" ? styles.tabBtnActive : ""}`}
        >
          {l.tabGroup}
        </button>
        <button
          onClick={() => setActiveTab("security")}
          className={`${styles.tabBtn} ${activeTab === "security" ? styles.tabBtnActive : ""}`}
        >
          {l.tabSecurity}
        </button>
      </div>

      {/* 3. Main Instruction Cards */}
      <div className={`${styles.contentCard} glass-card`}>
        
        {/* TAB 1: ALBUM MANAGEMENT */}
        {activeTab === "album" && (
          <div className={styles.infoSection}>
            <h2 className={styles.sectionHeader}>📖 {l.albumTitle}</h2>
            <p style={{ color: "var(--text-secondary)", lineHeight: 1.5 }}>{l.albumIntro}</p>

            {/* Interactive Sticker Sandbox */}
            <div className={styles.sandboxCard}>
              <div className={styles.sandboxInfo}>
                <div className={styles.sandboxTitle}>✨ {language === "es" ? "Caja de pruebas interactiva" : "Interactive sandbox (Test gestures)"}</div>
                <p className={styles.sandboxDesc}>{l.interactiveTip}</p>
                <ul className={styles.sandboxGesturesList}>
                  <li>{l.step1Desc}</li>
                  <li>{l.step3Desc}</li>
                </ul>
              </div>

              <div className={styles.sandboxInteractiveArea}>
                <div className={styles.mockStickerList}>
                  {/* Mock Sticker 1 (Normal) */}
                  <div className={styles.mockStickerContainer}>
                    <div
                      onClick={() => handleStickerClick("normal")}
                      onContextMenu={(e) => handleContextMenu(e, "normal")}
                      onTouchStart={() => handleTouchStart("normal")}
                      onTouchEnd={handleTouchEnd}
                      className={`${styles.sticker} ${mockQty > 0 ? styles.stickerOwned : styles.stickerEmpty}`}
                      style={{
                        background: mockQty > 0 ? "linear-gradient(to bottom, #006341, #ffffff, #c8102e)" : "",
                        color: mockQty > 0 ? "#1e293b" : ""
                      }}
                    >
                      1
                    </div>
                    {mockQty >= 2 && (
                      <div className={styles.duplicateTag}>+{mockQty - 1}</div>
                    )}
                  </div>

                  {/* Mock Sticker 2 (Special) */}
                  <div className={styles.mockStickerContainer}>
                    <div
                      onClick={() => handleStickerClick("special")}
                      onContextMenu={(e) => handleContextMenu(e, "special")}
                      onTouchStart={() => handleTouchStart("special")}
                      onTouchEnd={handleTouchEnd}
                      className={`${styles.sticker} ${mockSpecialQty > 0 ? styles.stickerSpecialOwned : styles.stickerSpecialEmpty}`}
                    >
                      8
                    </div>
                    {mockSpecialQty >= 2 && (
                      <div className={styles.duplicateTag}>+{mockSpecialQty - 1}</div>
                    )}
                  </div>
                </div>
                <div className={styles.feedbackMsg} style={{ opacity: feedback ? 1 : 0 }}>
                  {feedback}
                </div>
              </div>
            </div>

            <div className={styles.stepsGrid}>
              <div className={styles.stepItem}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <span className={styles.stepNum}>1</span>
                  <div className={styles.stepTitle}>{l.step1Title.replace(/^\d+\.\s*/, "")}</div>
                </div>
                <p className={styles.stepDesc}>{l.step1Desc}</p>
              </div>
              <div className={styles.stepItem}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <span className={styles.stepNum}>2</span>
                  <div className={styles.stepTitle}>{l.step2Title.replace(/^\d+\.\s*/, "")}</div>
                </div>
                <p className={styles.stepDesc}>{l.step2Desc}</p>
              </div>
              <div className={styles.stepItem}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <span className={styles.stepNum}>3</span>
                  <div className={styles.stepTitle}>{l.step3Title.replace(/^\d+\.\s*/, "")}</div>
                </div>
                <p className={styles.stepDesc}>{l.step3Desc}</p>
              </div>
              <div className={styles.stepItem}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <span className={styles.stepNum}>4</span>
                  <div className={styles.stepTitle}>{l.step4Title.replace(/^\d+\.\s*/, "")}</div>
                </div>
                <p className={styles.stepDesc}>{l.step4Desc}</p>
              </div>
            </div>

            {/* Quick-add example card */}
            <div className={styles.exampleBox}>
              <div className={styles.exampleHeader}>📋 {l.quickPasteEx}</div>
              <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                {language === "es" ? "Ingresa códigos separados por comas. El sistema detectará las secciones correspondientes de forma automática:" : "Enter sticker codes separated by commas. The system will automatically map them to their corresponding groups:"}
              </span>
              <code className={styles.codeExample}>
                MEX 1, MEX 2, USA 10, CAN 4, FWC 8, FWC 15
              </code>
            </div>
          </div>
        )}

        {/* TAB 2: TRADING & MATCHES */}
        {activeTab === "trade" && (
          <div className={styles.infoSection}>
            <h2 className={styles.sectionHeader}>🔄 {l.tradeTitle}</h2>
            <p style={{ color: "var(--text-secondary)", lineHeight: 1.5 }}>{l.tradeIntro}</p>

            <div className={styles.stepsGrid}>
              <div className={styles.stepItem}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <span className={styles.stepNum}>1</span>
                  <div className={styles.stepTitle}>{l.tradeStep1Title.replace(/^\d+\.\s*/, "")}</div>
                </div>
                <p className={styles.stepDesc}>{l.tradeStep1Desc}</p>
              </div>
              <div className={styles.stepItem}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <span className={styles.stepNum}>2</span>
                  <div className={styles.stepTitle}>{l.tradeStep2Title.replace(/^\d+\.\s*/, "")}</div>
                </div>
                <p className={styles.stepDesc}>{l.tradeStep2Desc}</p>
              </div>
              <div className={styles.stepItem}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <span className={styles.stepNum}>3</span>
                  <div className={styles.stepTitle}>{l.tradeStep3Title.replace(/^\d+\.\s*/, "")}</div>
                </div>
                <p className={styles.stepDesc}>{l.tradeStep3Desc}</p>
              </div>
            </div>

            <div className={styles.exampleBox}>
              <div className={styles.exampleHeader}>📤 {language === "es" ? "Ejemplo de Lista Compartida" : "Shared List Example"}</div>
              <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                {language === "es" ? "Las listas generadas contienen banderitas para mayor legibilidad y agrupan los hologramas especiales automáticamente:" : "The generated lists contain flags for scanning readability and group holograms automatically:"}
              </span>
              <code className={styles.codeExample}>
                {`AlbumHelper - Lista\nUsa Méx Can 26\nMe faltan\nFWC 🌎: 8, 15\nMEX 🇲🇽: 1, 2\nUSA 🇺🇸: 10\nCAN 🇨🇦: 4\n\nhttp://localhost:3000`}
              </code>
            </div>
          </div>
        )}

        {/* TAB 3: FAMILY GROUP */}
        {activeTab === "group" && (
          <div className={styles.infoSection}>
            <h2 className={styles.sectionHeader}>👨‍👩‍👧‍👦 {l.groupTitle}</h2>
            <p style={{ color: "var(--text-secondary)", lineHeight: 1.5 }}>{l.groupIntro}</p>

            <div className={styles.stepsGrid}>
              <div className={styles.stepItem}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <span className={styles.stepNum}>1</span>
                  <div className={styles.stepTitle}>{l.groupStep1Title.replace(/^\d+\.\s*/, "")}</div>
                </div>
                <p className={styles.stepDesc}>{l.groupStep1Desc}</p>
              </div>
              <div className={styles.stepItem}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <span className={styles.stepNum}>2</span>
                  <div className={styles.stepTitle}>{l.groupStep2Title.replace(/^\d+\.\s*/, "")}</div>
                </div>
                <p className={styles.stepDesc}>{l.groupStep2Desc}</p>
              </div>
              <div className={styles.stepItem}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <span className={styles.stepNum}>3</span>
                  <div className={styles.stepTitle}>{l.groupStep3Title.replace(/^\d+\.\s*/, "")}</div>
                </div>
                <p className={styles.stepDesc}>{l.groupStep3Desc}</p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: ACCOUNT SECURITY */}
        {activeTab === "security" && (
          <div className={styles.infoSection}>
            <h2 className={styles.sectionHeader}>🛡️ {l.securityTitle}</h2>
            <p style={{ color: "var(--text-secondary)", lineHeight: 1.5 }}>{l.securityIntro}</p>

            <div className={styles.stepsGrid}>
              <div className={styles.stepItem}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <span className={styles.stepNum}>1</span>
                  <div className={styles.stepTitle}>{l.securityStep1Title.replace(/^\d+\.\s*/, "")}</div>
                </div>
                <p className={styles.stepDesc}>{l.securityStep1Desc}</p>
              </div>
              <div className={styles.stepItem}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <span className={styles.stepNum}>2</span>
                  <div className={styles.stepTitle}>{l.securityStep2Title.replace(/^\d+\.\s*/, "")}</div>
                </div>
                <p className={styles.stepDesc}>{l.securityStep2Desc}</p>
              </div>
              <div className={styles.stepItem}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <span className={styles.stepNum}>3</span>
                  <div className={styles.stepTitle}>{l.securityStep3Title.replace(/^\d+\.\s*/, "")}</div>
                </div>
                <p className={styles.stepDesc}>{l.securityStep3Desc}</p>
              </div>
            </div>
          </div>
        )}

        {/* Back Link Button */}
        <div className={styles.actionsRow}>
          <Link href="/album" className="btn-primary" style={{ textDecoration: "none" }}>
            <span className={styles.backBtn}>📖 {l.backToAlbum}</span>
          </Link>
        </div>

      </div>

      {/* FOOTER */}
      <footer style={{ textAlign: "center", fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "1rem" }}>
        {l.aboutRaskitoma}
      </footer>

    </div>
  );
}
