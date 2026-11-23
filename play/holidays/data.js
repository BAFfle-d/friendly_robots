// HoliBot Match: every holiday, card and saying lives here, so wording changes need no code change.
// Pictures drop in by file name (see README.txt, "HOLIBOT MATCH"). A missing picture shows its words instead.
window.HoliMatch = {
  // How many holidays each round draws at random from the nine.
  PER_ROUND: 6,

  // Where the pictures go. Save each one as a PNG with the exact name listed in README.txt.
  IMG_DIR: '/play/holidays/img/',

  // The prize after round 5: Barry's four coloring packs (PDF, four letter-size pages each).
  // thumb is page 1 of the pack. Each win on a browser gives the next pack, 1 to 4, then 1 again.
  PRIZE: {
    title: 'You won a coloring pack!',
    packs: [
      {file: '/play/holidays/prize/feliz-and-festiva-pack-1.pdf', thumb: '/play/holidays/prize/pack-1.png',
       holidays: 'Bodhi Day, Christmas, Diwali, Hanukkah'},
      {file: '/play/holidays/prize/feliz-and-festiva-pack-2.pdf', thumb: '/play/holidays/prize/pack-2.png',
       holidays: 'Mawlid, Lunar New Year, New Year, Yule'},
      {file: '/play/holidays/prize/feliz-and-festiva-pack-3.pdf', thumb: '/play/holidays/prize/pack-3.png',
       holidays: 'Christmas, Kwanzaa, Mawlid, Diwali'},
      {file: '/play/holidays/prize/feliz-and-festiva-pack-4.pdf', thumb: '/play/holidays/prize/pack-4.png',
       holidays: 'Hanukkah, Lunar New Year, New Year, Bodhi Day'}
    ]
  },

  // The book's nine holidays, in the book's order.
  // icons: the two footer icons from the book. The first goes on the holiday's name card,
  // the second on the card it matches, so kids get a visual link without matching the same picture.
  // The names say which symbol from Barry's image set is in each file; the files are named by holiday, not by icon.
  HOLIDAYS: [
    {id: 'bodhi-day', name: 'Bodhi Day', color: '#2f8f5b', icons: ['lotus', 'dharma wheel']},
    {id: 'diwali', name: 'Diwali', color: '#e0791a', icons: ['rangoli', 'string of diyas']},
    {id: 'kwanzaa', name: 'Kwanzaa', color: '#1f7a3a', icons: ['unity cup', 'harvest basket']},
    {id: 'yule', name: 'Yule', color: '#5b6b2e', icons: ['wheel of the year', 'straw goat']},
    {id: 'mawlid', name: 'Mawlid', color: '#127a74', icons: ['mosque', 'string of lanterns']},
    {id: 'lunar-new-year', name: 'Lunar New Year', color: '#c4232b', icons: ['red lantern', 'dragon']},
    {id: 'christmas', name: 'Christmas', color: '#b3262e', icons: ['ornament', 'sleigh with gifts']},
    {id: 'hanukkah', name: 'Hanukkah', color: '#1f5fb8', icons: ['dreidel', 'gelt']},
    {id: 'new-years', name: "New Year's", color: '#6b3fb3', icons: ['party horn', 'twelve grapes']}
  ],

  // The five rounds. kind 'picture' cards show img/<prefix>-<holiday id>.png once it exists,
  // with the words underneath. kind 'words' cards are words only, always.
  // note: one short line from the book shown after a correct match.
  ROUNDS: [
    {
      title: 'Holiday things',
      ask: 'Match each thing to its holiday.',
      kind: 'picture', prefix: 'object',
      cards: {
        'bodhi-day': {text: 'Heart-shaped bodhi leaf', note: 'The bodhi leaf reminds people of the tree where Siddhartha found wisdom.'},
        'diwali': {text: 'Diya lamps', note: 'Diyas are little lamps. Their light celebrates goodness and knowledge.'},
        'kwanzaa': {text: 'Kinara', note: 'The kinara holds seven candles, one for each Kwanzaa principle.'},
        'yule': {text: 'Yule log', note: 'Long ago, a Yule log was burned in the fireplace.'},
        'mawlid': {text: 'Tray of sweets', note: 'In Egypt, these Mawlid sweets are called Halawet al-Mawlid.'},
        'lunar-new-year': {text: 'Red envelope', note: 'Red stands for happiness and good fortune.'},
        'christmas': {text: 'Decorated tree', note: 'Many families decorate an evergreen tree for Christmas.'},
        'hanukkah': {text: 'Menorah', note: 'Eight candles for eight nights, plus a helper candle called the shamash.'},
        'new-years': {text: 'Clock at midnight', note: 'The whole world counts down to welcome the new year!'}
      }
    },
    {
      title: 'Feliz dresses up',
      ask: 'Which holiday is Feliz ready for?',
      kind: 'picture', prefix: 'feliz',
      cards: {
        'bodhi-day': {text: 'Feliz sitting still to meditate'},
        'diwali': {text: 'Feliz with a flower garland'},
        'kwanzaa': {text: 'Feliz with a unity cup'},
        'yule': {text: 'Feliz with evergreen and holly'},
        'mawlid': {text: 'Feliz with a lantern'},
        'lunar-new-year': {text: 'Feliz with an orange and a fan'},
        'christmas': {text: 'Feliz in a Santa hat'},
        'hanukkah': {text: 'Feliz with a menorah'},
        'new-years': {text: 'Feliz in a party hat'}
      }
    },
    {
      title: 'Holiday words',
      ask: 'Match each saying to its holiday.',
      kind: 'words',
      cards: {
        'bodhi-day': {text: 'Wisdom and peace', note: 'Bodhi Day is a time for quiet, kindness, and wisdom.'},
        'diwali': {text: 'Shubh Deepavali!', note: 'Shubh Deepavali means Happy Diwali!'},
        'kwanzaa': {text: 'Habari gani?', note: 'Habari gani means "What’s the news?"'},
        'yule': {text: 'Blessed be', note: 'A warm wish many people share at Yule.'},
        'mawlid': {text: 'Salaam!', note: 'Salaam means peace. It is a greeting, like hello.'},
        'lunar-new-year': {text: 'Chūnjié kuàilè!', note: 'Chūnjié kuàilè means Happy Spring Festival!'},
        'christmas': {text: 'Feliz Navidad!', note: 'Feliz Navidad means Merry Christmas in Spanish.'},
        'hanukkah': {text: 'A great miracle happened there', note: 'These are the words on a dreidel.'},
        'new-years': {text: 'Auld Lang Syne', note: 'An old Scottish song about old friends and good times.'}
      }
    },
    {
      title: 'Festiva dresses up',
      ask: 'Which holiday is Festiva ready for?',
      kind: 'picture', prefix: 'festiva',
      cards: {
        'bodhi-day': {text: 'Festiva with a bodhi leaf'},
        'diwali': {text: 'Festiva with a diya lamp'},
        'kwanzaa': {text: 'Festiva sharing the unity cup'},
        'yule': {text: 'Festiva hugging a Yule log'},
        'mawlid': {text: 'Festiva with a lantern and a moon'},
        'lunar-new-year': {text: 'Festiva with a dragon puppet'},
        'christmas': {text: 'Festiva in a Santa suit'},
        'hanukkah': {text: 'Festiva with a jelly doughnut'},
        'new-years': {text: 'Festiva with a party horn'}
      }
    },
    {
      title: 'Holiday people',
      ask: 'Match the people to their holiday.',
      kind: 'words',
      cards: {
        'bodhi-day': {text: 'Siddhartha Gautama', note: 'Siddhartha became known as the Buddha, "the Awakened One."'},
        'diwali': {text: 'Hindus, Jains, and Sikhs', note: 'Diwali is celebrated by Hindus, Jains, and Sikhs.'},
        'kwanzaa': {text: 'African American families', note: 'Kwanzaa celebrates African American family, community, and culture.'},
        'yule': {text: 'The ancient Norse', note: 'Long ago, Norse people held Yule feasts in the middle of winter.'},
        // Text only, on purpose: the Prophet Muhammad is never pictured anywhere in this game.
        'mawlid': {text: 'The Prophet Muhammad', note: 'Mawlid celebrates his birthday. Muslims say "peace and blessings be upon him" after his name.'},
        'lunar-new-year': {text: 'Dragon dancers', note: 'Dancers move together to make the dragon twist and leap.'},
        'christmas': {text: 'Saint Nicholas', note: 'Saint Nicholas gave gifts to children and families in need.'},
        'hanukkah': {text: 'The Maccabees', note: 'Long ago, the Maccabees won back the holy Temple.'},
        'new-years': {text: 'Father Time and Baby New Year', note: 'The old year waves goodbye, and the new year says hello!'}
      }
    }
  ]
};
