// HoliBot Match: every holiday, card and saying lives here, so wording changes need no code change.
// Pictures drop in by file name (see README.txt, "HOLIBOT MATCH"). A missing picture shows its words instead.
window.HoliMatch = {
  // How many holidays each round draws at random from the nine.
  PER_ROUND: 6,

  // Where the pictures go. Save each one as a PNG with the exact name listed in README.txt.
  IMG_DIR: '/play/holidays/img/',

  // The prize after round 5. Swap in the real page with the same file name.
  PRIZE: {
    file: '/play/holidays/prize/holibot-coloring-page.png',
    download: 'feliz-and-festiva-coloring-page.png',
    title: 'Your HoliBot coloring page!'
  },

  // The book's nine holidays, in the book's order.
  // icons: the two footer icons from the book. The first goes on the holiday's name card,
  // the second on the card it matches, so kids get a visual link without matching the same picture.
  // The names are placeholders until the real icons arrive; the files are named by holiday, not by icon.
  HOLIDAYS: [
    {id: 'bodhi-day', name: 'Bodhi Day', color: '#2f8f5b', icons: ['bodhi leaf', 'lotus']},
    {id: 'diwali', name: 'Diwali', color: '#e0791a', icons: ['diya', 'rangoli']},
    {id: 'kwanzaa', name: 'Kwanzaa', color: '#1f7a3a', icons: ['kinara', 'ear of corn']},
    {id: 'yule', name: 'Yule', color: '#5b6b2e', icons: ['pine branch', 'sun']},
    {id: 'mawlid', name: 'Mawlid', color: '#127a74', icons: ['crescent moon', 'star']},
    {id: 'lunar-new-year', name: 'Lunar New Year', color: '#c4232b', icons: ['lantern', 'dragon']},
    {id: 'christmas', name: 'Christmas', color: '#b3262e', icons: ['ornament', 'candy cane']},
    {id: 'hanukkah', name: 'Hanukkah', color: '#1f5fb8', icons: ['menorah', 'dreidel']},
    {id: 'new-years', name: "New Year's", color: '#6b3fb3', icons: ['party hat', 'clock']}
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
        'mawlid': {text: 'Nut and sesame sweets', note: 'In Egypt, these Mawlid sweets are called Halawet al-Mawlid.'},
        'lunar-new-year': {text: 'Red envelope', note: 'Red stands for happiness and good fortune.'},
        'christmas': {text: 'Star', note: 'Many families put a star on top of the Christmas tree.'},
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
        'diwali': {text: 'Feliz in a new kurta'},
        'kwanzaa': {text: 'Feliz in a dashiki'},
        'yule': {text: 'Feliz in a winter cloak with a sun badge'},
        'mawlid': {text: 'Feliz in a long white thobe'},
        'lunar-new-year': {text: 'Feliz in a red silk jacket'},
        'christmas': {text: 'Feliz in a Santa suit'},
        'hanukkah': {text: 'Feliz in a kippah and blue scarf'},
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
        'bodhi-day': {text: 'Festiva holding a lotus flower'},
        'diwali': {text: 'Festiva in a sari'},
        'kwanzaa': {text: 'Festiva in a kente head wrap'},
        'yule': {text: 'Festiva in an evergreen crown'},
        'mawlid': {text: 'Festiva in a headscarf'},
        'lunar-new-year': {text: 'Festiva in a red qipao'},
        'christmas': {text: 'Festiva in an elf hat'},
        'hanukkah': {text: 'Festiva in a blue-and-white sweater'},
        'new-years': {text: 'Festiva in a sparkly party dress'}
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
