// ==================== Templates ====================
const templates = [
  {
    name: "Rechnung",
    filename: "Rechnung_{{proxy}}_{{kunde}}.csv",
    title: "Rechnung für {{kunde}} - Ticket {{ticket_nr}}",
    text: "Sehr geehrte/r {{kunde}},\nRechnung für {{uname}} im stage {{stage}} über {{betrag}} Euro.\n\nMit freundlichen Grüßen\n{{firma_tews}}",
    
    fields_vorlage: {
        uname: { value:"Server1,Server2", editable:true, multi:true, repeat:true, options:null, perRepeat:false, conditions:[] },
        kunde: { value:"", editable:true, multi:false, repeat:false, options:null, perRepeat:false, conditions:[] },
        betrag: { value:"100", editable:true, multi:false, repeat:false, options:null, perRepeat:false, conditions:[] },
        proxy: { value:"", editable:true, multi:false, repeat:false, options:["proxy1","proxy2","proxy3"], perRepeat:true, conditions:[] },
        stage: {
            value: "",
            editable: true,
            multi: false,
            conditions: [
            { key: "stage", value: "Abbau", set: "am Abbau" },
            { key: "stage", value: "Transport", set: "beim Transport" }
            ],
        },
        firma_tews: { value:"Tews GmbH", editable:false, multi:false, repeat:false, options:null, perRepeat:false, conditions:[] }
    },

    fields_csv: {
      uname: { repeat:true, multi:true, conditions:[] },
      kunde: { repeat:false, multi:false, conditions:[] },
      betrag: { repeat:false, multi:false, conditions:[] },
      proxy: { repeat:false, multi:false, conditions:[] },
      firma_tews: { repeat:false, multi:false, conditions:[] }
    },

    pairs: [
      { user: "example_user1", group: "example_group1", editable:false, perRepeat:true },
      { user: "example_user2", group: "example_group2", editable:true, perRepeat:true }
    ]
  }
];
