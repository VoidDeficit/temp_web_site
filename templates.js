const templates = [
  {
    name: "Rechnung",
    filename: "Rechnung_{{proxy}}_{{kunde}}_{{stage_name}}.csv",
    title: "stage_name {{stage_name}} location {{location}}  Rechnung für {{kunde}} - Ticket {{ticket_nr}}",
    text: "Sehr geehrte/r {{kunde}},\nRechnung für {{uname}} im stage {{stage_name}} über {{betrag}} Euro.\n\nMit freundlichen Grüßen\n{{firma}}",

    fields_vorlage: {
      ticket_nr:   { value:"", editable:true, multi:false, repeat:false, perRepeat:false, options:null, conditions:[] },
      kunde:       { value:"", editable:true, multi:false, repeat:false, perRepeat:false, options:null, conditions:[] },
      betrag:      { value:"100", editable:true, multi:false, repeat:false, perRepeat:false, options:null, conditions:[] },
      stage:       { value:"", editable:true, multi:false, repeat:false, perRepeat:false, conditions:[] },
      stage_name:  { value:"", editable:false, multi:false, repeat:false, perRepeat:false, uniqueResult: true,
                     conditions: [
                       { key:"stage", value:"Abbau", set:"am Abbau", mode:"equals", split: true },
                       { key:"stage", value:"bau", set:"enthält Bau", mode:"contains", split: true },
                       { key:"stage", value:".*tr.*", set:"Regex Transport", mode:"regex", split: true }
                     ]
                   },
      firma:       { value:"Tews GmbH", editable:false, multi:false, repeat:false, perRepeat:false, options:null, conditions:[] },
      location:    { value:"", editable:true, multi:false, repeat:false, perRepeat:false, ref:"stage", conditions:[] },

      // Felder die für jeden Server angezeigt werden
      test_repeat: { value:"", editable:true, multi:false, repeat:false, perRepeat:true, options:["optA","optB","optC"], conditions:[] },
      server:      { value:"", editable:true, multi:true, repeat:true, perRepeat:false } // Eingabe: server1,server2
    },

    fields_csv: {
      // CSV bekommt server_uname automatisch vom server-Feld
      server_uname: { ref:"server", editable:false, repeat:true, multi:true, conditions:[] },
      kunde_csv:   { repeat:false, multi:false, conditions:[] },
      betrag_csv:  { repeat:false, multi:false, conditions:[] },
      user:    {},
      proxy:   { repeat:false, multi:false,
                 conditions:[
                   { key:"stage", value:"Abbau", set:"proxy1", mode:"equals" },
                   { key:"stage", value:"bau", set:"proxy2", mode:"contains" },
                   { key:"stage", value:"^Tr", set:"proxy3", mode:"regex" }
                 ]
               },
      test:    { ref:"test_repeat", repeat:false, multi:false, perRepeat:true, conditions:[] },
      firma:   { repeat:false, multi:false, conditions:[] },
      group:   {}
    },

    pairBy: "proxy",
    pairs: [
      { user:"example_user1", group:"example_group1", editable:false, perRepeat:true },
      { user:"example_user2", group:"example_group2", editable:true, perRepeat:true },
      { user:"example_user1", group:"example_group2", editable:false, perRepeat:true }
    ]
  }
];
