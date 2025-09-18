const templates = [
  {
    name: "Rechnung",
    filename: "Rechnung_{{proxy}}_{{kunde}}.csv",
    title: "stage_name {{stage_name}} location {{location}}  Rechnung für {{kunde}} - Ticket {{ticket_nr}}",
    text: "Sehr geehrte/r {{kunde}},\nRechnung für {{uname}} im stage {{stage_name}} über {{betrag}} Euro.\n\nMit freundlichen Grüßen\n{{firma}}",

    fields_vorlage: {
      ticket_nr:   { value:"", editable:true, multi:false, repeat:false, perRepeat:false, options:null, conditions:[] },
      kunde:       { value:"", editable:true, multi:false, repeat:false, perRepeat:false, options:null, conditions:[] },
      betrag:      { value:"100", editable:true, multi:false, repeat:false, perRepeat:false, options:null, conditions:[] },
      stage:       { value:"", editable:true, multi:false, repeat:false, perRepeat:false, conditions:[] },
      stage_name:  { value:"", editable:false, multi:false, repeat:false, perRepeat:false,
                     conditions: [
                       { key:"stage", value:"Abbau", set:"am Abbau", mode:"equals", split: true },
                       { key:"stage", value:"bau", set:"enthält Bau", mode:"contains", split: true },
                       { key:"stage", value:".*tr.*", set:"Regex Transport", mode:"regex", split: true }
                     ]
                   },
      firma:       { value:"Tews GmbH", editable:false, multi:false, repeat:false, perRepeat:false, options:null, conditions:[] },
      location:    { value:"", editable:true, multi:false, repeat:false, perRepeat:false, ref:"stage", conditions:[] },
      test_repeat: { value:"", editable:true, multi:false, repeat:false, perRepeat:true, options:["optA","optB","optC"], conditions:[] }
    },

    fields_csv: {
      uname:   { editable:true, repeat:true, multi:true, conditions:[] },
      kunde:   { repeat:false, multi:false, conditions:[] },
      betrag:  { repeat:false, multi:false, conditions:[] },
      proxy:   { repeat:false, multi:false,
                 conditions:[
                   { key:"stage", value:"Abbau", set:"proxy1", mode:"equals" },
                   { key:"stage", value:"bau", set:"proxy2", mode:"contains" },
                   { key:"stage", value:"^Tr", set:"proxy3", mode:"regex" }
                 ]
               },
      test:    { ref:"test_repeat", repeat:false, multi:false, perRepeat:true, conditions:[] },
      firma:   { repeat:false, multi:false, conditions:[] }
    },

    pairs: [
      { user:"example_user1", group:"example_group1", editable:false, perRepeat:true },
      { user:"example_user2", group:"example_group2", editable:true, perRepeat:true }
    ]
  }
];
