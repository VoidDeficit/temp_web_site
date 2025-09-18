// ==================== Templates ====================
const templates = [
  {
    name: "Rechnung",
    filename: "Rechnung_{{proxy}}_{{kunde}}.csv",
    title: "location {{location}}  Rechnung für {{kunde}} - Ticket {{ticket_nr}}",
    text: "Sehr geehrte/r {{kunde}},\nRechnung für {{uname}} im stage {{stage_name}} über {{betrag}} Euro.\n\nMit freundlichen Grüßen\n{{firma_tews}}",
    
    fields_vorlage: {
        ticket_nr:  { value:"",              editable:true,  multi:false, repeat:false, perRepeat:false, options:null,              conditions:[] },
      uname:      { value:"Server1,Server2", editable:true,  multi:true,  repeat:true,  perRepeat:false, options:null,              conditions:[] },
      kunde:      { value:"",              editable:true,  multi:false, repeat:false, perRepeat:false, options:null,              conditions:[] },
      betrag:     { value:"100",           editable:true,  multi:false, repeat:false, perRepeat:false, options:null,              conditions:[] },
      stage:      { value:"",              editable:true,  multi:false, repeat:false, perRepeat:false, options:null,              conditions:[] },
      stage_name: { value:"",              editable:true,  multi:false, repeat:false, perRepeat:false,
                    conditions:[
                      { key: "stage", value: "Abbau",    set: "am Abbau" },
                      { key: "stage", value: "Transport", set: "beim Transport" }
                    ]
                  },
      firma_tews: { value:"Tews GmbH",     editable:false, multi:false, repeat:false, perRepeat:false, options:null,              conditions:[] },
      location:   { value:"",              editable:true,  multi:false, repeat:false, perRepeat:false, ref:"stage",             conditions:[] },
      // hier die korrekte options-Definition (nicht doppelt, kein null)
      test_repeat:{ value:"",              editable:true,  multi:false, repeat:false, perRepeat:true,  options:["optA","optB","optC"], conditions:[] }
    },

    fields_csv: {
      uname:     { repeat:true,  multi:true,  conditions:[] },
      kunde:     { repeat:false, multi:false, conditions:[] },
      betrag:    { repeat:false, multi:false, conditions:[] },
      proxy:     { repeat:false, multi:false, conditions:[] },
      test:      { ref:"test_repeat", repeat:false, multi:false, perRepeat:true, conditions:[] },
      firma_tews: { repeat:false, multi:false, conditions:[] }
    },

    pairs: [
      { user: "example_user1", group: "example_group1", editable:false, perRepeat:true },
      { user: "example_user2", group: "example_group2", editable:true,  perRepeat:true }
    ]
  }
];
