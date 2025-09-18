const templates = [
  {
    name: "Rechnung",
    title: "Rechnung für {{kunde}} - Ticket {{ticket_nr}}",
    text: "Sehr geehrte/r {{kunde}},\nRechnung für {{uname}} über {{betrag}} Euro.\n\nMit freundlichen Grüßen\n{{firma}}",
    filename: "Rechnung_{{proxy}}_{{kunde}}.csv",

    // Platzhalter nur für Titel/Text
    fields_vorlage: {
      ticket_nr: { value: "12345", editable: true },
      kunde: { value: "", editable: true },
      firma: { value: "Tews GmbH", editable: false }
    },

    // Felder für CSV
    fields_csv: {
      uname: { value: "", editable: true, repeat: true }, // Repeat-Feld
      betrag: { value: "100", editable: true },
      proxy: { value: "", editable: true, options: ["proxy1", "proxy2", "proxy3"] }, // Dropdown
      status: { value: "aktiv", editable: true, options: ["aktiv", "inaktiv"], perRepeat: true }, // perRepeat + Dropdown
      gruppe: { value: "", editable: true, multi: false, perRepeat: true } // Multi-Auswahl
    },

    pairs: [
      { user: "user1", group: "group1", editable: true, perRepeat: true },
      { user: "user2", group: "group2", editable: false, perRepeat: true }
    ]
  },

  {
    name: "Server-Liste",
    title: "Serverliste für {{kunde}}",
    text: "Sehr geehrte/r {{kunde}},\nHier die Zugänge für Ihre Server:\n{{server}}",
    filename: "Serverliste_{{kunde}}.csv",

    fields_vorlage: {
      kunde: { value: "", editable: true }
    },

    fields_csv: {
      server: { value: "", editable: true, repeat: true }, // Repeat
      os: { value: "Linux", editable: true, options: ["Linux", "Windows", "BSD"], perRepeat: true }, // Dropdown
      ip: { value: "", editable: true, perRepeat: true },
      admin: { value: "root", editable: false, perRepeat: true } // feste Werte
    },

    pairs: []
  }
];
