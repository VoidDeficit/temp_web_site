// ==================== Templates ====================
const templates = [
  {
    name: "Rechnung",
    filename: "Rechnung_{{proxy}}_{{kunde}}.csv",
    title: "Rechnung für {{kunde}} - Ticket {{ticket_nr}}",
    text: "Sehr geehrte/r {{kunde}},\nRechnung für {{uname}} über {{betrag}} Euro.\n\nMit freundlichen Grüßen\n{{firma_tews}}",
    fields: {
      uname: { value:"", editable:true, multi:true, perServer:false, repeat:true },
      kunde: { value:"", editable:true, multi:false, perServer:false },
      betrag: { value:"100", editable:true, multi:false, perServer:false },
      proxy: { value:"default-proxy", editable:false, multi:false, perServer:true },
      region: { value:"EU", editable:true, multi:false, perServer:false, options:["EU","US","ASIA"] },
      firma_tews: { value:"Tews GmbH", editable:false, multi:false, perServer:false }
    },
    pairs: [
      { user: "example_user1", group: "example_group1", editable:false, perServer:true },
      { user: "example_user2", group: "example_group2", editable:true, perServer:true }
    ]
  },
  {
    name: "Rechnung 2",
    filename: "Rechnung_{{proxy2}}_{{kunde}}.csv",
    title: "Rechnung für {{kunde}} - Ticket {{ticket_nr}}",
    text: "Sehr geehrte/r {{kunde}},\nRechnung für {{uname}} über {{betrag}} Euro.\n\nMit freundlichen Grüßen\n{{firma_tews}}",
    fields: {
      uname: { value:"", editable:true, multi:true, perServer:false, repeat:true },
      kunde: { value:"", editable:true, multi:false, perServer:false },
      betrag: { value:"100", editable:true, multi:false, perServer:false },
      proxy2: { value:"proxy-x", editable:true, multi:false, perServer:true },
      firma_tews: { value:"Tews GmbH", editable:false, multi:false, perServer:false }
    },
    pairs: []
  }
];
