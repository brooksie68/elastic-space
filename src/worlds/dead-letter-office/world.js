/*
 * The Dead Letter Office — full 3D room rebuild, 2026-07-21 (claude-fable).
 * A walkable basement mail hall (three.js), twice the floor area of Mandala Shop.
 * The Meshy postmaster (rig + 18-clip anim pack, 2026-07-17) walks his shift:
 * desk work, basket pickups, filing, feeding the furnace, punching the clock,
 * coffee. Undeliverable mail falls from a ceiling chute into the wire basket and
 * can be read from any angle. The original twelve letters are authored
 * (2026-07-04) and unchanged (25 more joined the deck 2026-07-30); the four
 * airmail letters still carry the drift exits, and the stairwell door is a fifth.
 *
 * Hard-won integration facts honored here:
 *  - Meshy materials carry the color atlas twice (map + emissiveMap): the
 *    postmaster's emissive layer is stripped so the room's lights own him.
 *  - One-shot actions MUST fade out in the mixer 'finished' handler or their
 *    clamped end poses pile up in the blend forever (the tiny-gestures bug).
 *  - Never hold a looping action at timeScale exactly 0 (bone-write stall).
 *  - Tile textures follow the never-black rule: procedural canvas base first,
 *    Meshy tile drawn over it on load.
 */
import * as THREE from 'three';
import { GLTFLoader } from '../../lib/three/loaders/GLTFLoader.js';
import { mergeGeometries } from '../../lib/three/utils/BufferGeometryUtils.js';

/* ============ the letters (first twelve authored 2026-07-04, protected;
   +25 acquisitions and +21 shelf-box strata 2026-07-30, +10 length strata
   and 3 trims 2026-07-31 — 68 total, the twelve remain verbatim) ============ */

const LETTERS = [
  {
    to: "The Occupant\n14 Milk Street\nAshfield",
    from: "M. Doyle\nRoom 6, The Excelsior",
    stamp: "No Such Street",
    postmark: ["Dead Letter", "Office", "Apr 1991"],
    body: [
      "I am returning your umbrella. I borrowed it on the 3rd of April, 1951, outside the cinema, meaning to give it back the following week. The week did not behave as expected.",
      "It has kept me dry through four cities and two marriages, and I am ashamed of how well it has worked.",
      "Please find it enclosed. (I could not fold it into the envelope. I have enclosed the idea of it instead.)",
    ],
    sign: "Apologetically, M.",
  },
  {
    to: "The Bureau of Forgotten Weather\nSub-basement 4\nThe Records Annex",
    from: "D. Okafor\nApt. 3, rear",
    stamp: "Addressee Unknown",
    postmark: ["Dead Letter", "Office", "Jun 1987"],
    body: [
      "I would like to request one (1) afternoon of light rain from June 1987 — the one that hit the tin roof of my grandmother's porch between roughly two and five o'clock.",
      "I have completed the enclosed forms as best I could. Where the form asked for coordinates I have written “the porch.”",
      "I understand there may be a waiting period.",
    ],
    sign: "Respectfully, D. Okafor",
  },
  {
    to: "The Keeper\nThe Old Light\nPoint Perpetua",
    from: "(no return address)",
    stamp: "Delivery Refused",
    postmark: ["Dead Letter", "Office", "Nov 1968"],
    body: [
      "Your light comes through my window every nine seconds and drags its white sleeve across my dreams. Last night it swept away a staircase I had almost finished climbing.",
      "I am not asking you to stop. I am asking what is at the top.",
    ],
    sign: "— A neighbor",
  },
  {
    to: "Cpl. T. Havel\nGeneral Delivery\nWherever the army keeps you now",
    from: "R.\nThe kitchen table",
    stamp: "Moved — Left No Address",
    postmark: ["Dead Letter", "Office", "Feb 1994"],
    body: [
      "Knight to f3.",
      "It has been your move for thirty-one years. I have kept the board set up on the kitchen table, and I dust the pieces on Sundays. The cat knocked over your queen in the autumn of '09 but I put her back exactly.",
      "Take your time. I only wanted you to know the game is still on.",
    ],
    sign: "Your friend, R.",
  },
  {
    to: "The Sea\n(all of it)",
    from: "Adm. B. Whitlock (ret.)\nThe Esplanade",
    stamp: "Unclaimed",
    postmark: ["Dead Letter", "Office", "Aug 1975"],
    body: [
      "On the 14th inst., at approximately noon, your representative — a wave of medium size — removed my hat from my head without provocation. It was a good hat.",
      "I demand its return, or a hat of equal value, or an explanation of what the sea is doing with all of them.",
    ],
    sign: "Cordially furious, Adm. B. Whitlock (ret.)",
  },
  {
    to: "The person I was at nineteen\nThe blue house on Delancey\n(they will know)",
    from: "You, later",
    stamp: "Postage Due: One Memory",
    postmark: ["Dead Letter", "Office", "Undated"],
    body: [
      "You were right about almost nothing, and I miss you terribly.",
      "Do not take the job. Take the trip. Learn the names of trees earlier than I did. The girl at the bakery is going to break your heart and it is worth it.",
      "P.S. We still cannot whistle.",
    ],
    sign: "— You, later",
  },
  {
    to: "The Department of Echoes\nCanyon District",
    from: "(name withheld, twice)",
    stamp: "Return to Sender",
    postmark: ["Dead Letter", "Office", "May 1982"],
    body: [
      "I write to complain that everything I say to your canyon has been coming back to me. I have said things to that canyon I only ever intended to send one way.",
      "Kindly filter what is returned. Some of it I have heard twice now and cannot stop hearing.",
    ],
    sign: "— (name withheld, twice)",
  },
  {
    to: "Miss E. Farrow\nSeat 14C, the 5:52 evening train\n(northbound)",
    from: "The passenger in 14D",
    stamp: "Undeliverable as Addressed",
    postmark: ["Dead Letter", "Office", "Oct 1959"],
    body: [
      "Things seen from the window between Halloway and the tunnel, as promised: one heron, standing in a flooded field like a nail. Three dogs, unrelated. A man painting a fence at dusk, badly. Forty-one telegraph poles. Your reflection, for the length of the tunnel.",
      "That last one is the reason I am writing.",
    ],
    sign: "— The passenger in 14D",
  },
  {
    to: "The Storm\nlast seen over the dusk field",
    from: "A return address\nwritten in blue ink",
    portal: { label: "Follow the return address somewhere else" },
    stamp: "Return to Sender",
    postmark: ["Dead Letter", "Office", "At Dusk"],
    body: [
      "We regret to report that your rain has been sent back the way it came. It fell upward all evening, and the flowers were not sure what to make of it.",
      "If you want to see it happen, you will have to stand in the field yourself.",
    ],
    sign: "— The undersigned wildflowers",
  },
  {
    to: "Whoever maintains the streetlight\nat the end of Vane Street",
    from: "A return address\nwith no known station",
    portal: { label: "Follow the return address somewhere else" },
    stamp: "Do Not Bend",
    postmark: ["Dead Letter", "Office", "3:11 AM"],
    body: [
      "Your streetlight has been flickering in a pattern. I wrote the pattern down. It is not random. It spells the same word over and over, and I have begun to see the word in other lights. The elevator. The exit sign. My telephone.",
      "If you want to know where the flicker comes from, the return address is real.",
    ],
    sign: "— Wide awake on Vane St.",
  },
  {
    to: "The Tender of Lanterns\nPelagic Habitat\nbelow the shelf",
    from: "A water-damaged\nreturn address",
    portal: { label: "Follow the return address somewhere else" },
    stamp: "Received Wet",
    postmark: ["Dead Letter", "Office", "High Tide"],
    body: [
      "Your shipment of light arrived damaged. Several lumens had leaked out of the crate and were found swimming in the harbor, where they have since been adopted by the fish. The fish glow now.",
      "We consider the matter resolved, but you may want to look in on your lanterns yourself.",
    ],
    sign: "— Harbormaster, night shift",
  },
  {
    to: "THE CURRENT OCCUPANT\nOF THIS PAGE",
    from: "No fixed address",
    portal: { label: "Follow the return address somewhere else" },
    stamp: "Final Notice",
    postmark: ["Dead Letter", "Office", "Now"],
    body: [
      "You have been in the sorting room a while now. That is allowed. The mail is patient, and so is the dark.",
      "But when you are ready: something bioluminescent has been asking after you. It does not use the postal system. It says you know the way, and if you don't, the return address does.",
    ],
    sign: "— The Office",
  },

  /* ---- the later acquisitions (2026-07-30, James's ask: 25 more) ---- */
  {
    to: "The Station Manager\nRadio KDLO\nFarmers Union Bldg.",
    from: "Mrs. L. Prue\nRural Route 2",
    stamp: "No Such Station",
    postmark: ["Dead Letter", "Office", "Oct 1951"],
    body: [
      "I listen every night while I do the ironing, and I have noticed that your announcer says the very same things each night, word for word — the same joke about the accordion, the same fiddle named Wilma, the same two advertisements.",
      "At first I minded. Now I iron to it like it was scripture. If he ever says something new, I believe it will mean something enormous has happened, and I am not sure I want that.",
      "Please do not change the programme.",
    ],
    sign: "— Mrs. L. Prue, listening",
  },
  {
    to: "To Whom It May Concern\nc/o Any Farm\nWith Crows",
    from: "E. Tillman\nTillman & Son, feed corn",
    stamp: "Insufficient Address",
    postmark: ["Dead Letter", "Office", "Sep 1963"],
    body: [
      "A reference for my scarecrow, retiring after eleven years on the northeast forty: quiet, punctual, took one day off during the tornado, and came back. The crows respect him, which is more than they ever gave me.",
      "He prefers facing east. I never asked.",
    ],
    sign: "— E. Tillman",
  },
  {
    to: "Miss Ada Kessler\n31 Foundry Street\nLowellville",
    from: "P. Novak\nc/o the Merchant Marine",
    stamp: "Moved — Left No Address",
    postmark: ["Dead Letter", "Office", "Mar 1954"],
    body: [
      "They tell me we sail Tuesday, and I find I cannot go without saying it plainly: it is you. It has been you since the dance at the grange hall, and it will keep on being you in every port they can invent.",
      "If this reaches you, write to the shipping office at Baltimore. I will leave word wherever I land.",
    ],
    sign: "Yours entire, P.",
  },
  {
    to: "P. Novak\nc/o the Shipping Office\nBaltimore",
    from: "A. Kessler\n(new address inside)",
    stamp: "Not Called For",
    postmark: ["Dead Letter", "Office", "Mar 1954"],
    body: [
      "Before you sail: yes. Whatever it was you were working up to say at the grange hall before your ship came in, the answer is yes, and has been for some time.",
      "I have moved to my sister's on Water Street — the landlady on Foundry would not hold my mail. Write to me there. I will wait, but hurry anyway.",
    ],
    sign: "— Ada",
  },
  {
    to: "The New Owner\nof the Hallett Upright\nsold at auction, lot 9",
    from: "V. Marsh, piano tuner\n(retired)",
    stamp: "Auction House Closed",
    postmark: ["Dead Letter", "Office", "Jan 1979"],
    body: [
      "I tuned that instrument for forty years, and I should tell you: middle C is a shade flat and will not hold true no matter what anyone does. I have watched three better men than me try.",
      "The lady of the house used to sing to it in the evenings, and after she passed, the note went down and stayed down. My advice is to leave it. Some things are in tune with something else.",
    ],
    sign: "— V. Marsh",
  },
  {
    to: "The Returns Desk\nCarnegie Free Library\nBranch No. 4",
    from: "H. Ostrander\nformerly of the 6th grade",
    stamp: "Branch Closed",
    postmark: ["Dead Letter", "Office", "Jun 1988"],
    body: [
      "Enclosed please find The Boys' Book of Polar Exploration, due April 11th, 1946. I have calculated the fine at four cents a day and I am prepared to discuss terms.",
      "In my defense, I read it eleven times the first year and once every year after, and it has gotten me through two wars and one marriage, which is more than most books manage.",
      "I have underlined some parts. I understand this is against the rules. So is keeping a book forty-two years.",
    ],
    sign: "— H. Ostrander, sorry",
  },
  {
    to: "The gentleman on the\nDaviston exchange, line 4\n(night of the ice storm)",
    from: "Operator No. 9",
    stamp: "Exchange Discontinued",
    postmark: ["Dead Letter", "Office", "Feb 1957"],
    body: [
      "You will not remember me. I connected you by mistake to a wrong number in Daviston the night the lines iced over. It is my job to disconnect errors, and I did not.",
      "You talked to that woman for four hours about nothing — dogs, pie, the war, the ice — and I sat with my hand on the key the whole time and listened like a person warming herself at a window.",
      "I am writing because I never learned whether you called her back. Somebody should know how it came out. I connected this county for thirty years, and that call is the one I think about.",
    ],
    sign: "— Operator No. 9",
  },
  {
    to: "The man who waves\nfrom the porch on Route 9\n(white house, red chair)",
    from: "A commuter\n(the green Hudson)",
    stamp: "House Not Found",
    postmark: ["Dead Letter", "Office", "Nov 1972"],
    body: [
      "For nine years you have waved at my car in the morning, and I have waved back, and I know nothing else about you, and I have told you more with that hand than I have told some family.",
      "This morning the chair was empty, and I drove on to work like a man with the floor gone out from under him. I am writing to the house in the hope that somebody there will tell me the wave has only moved indoors for the winter.",
    ],
    sign: "— The green Hudson, 7:40 or so",
  },
  {
    to: "The family that lost TIPPY\n(from the notice at\nthe Red Owl store)",
    from: "W. Odom\nout past the gravel pit",
    stamp: "Notice Weathered",
    postmark: ["Dead Letter", "Office", "Aug 1966"],
    body: [
      "Your notice said REWARD and gave a number, but the rain got to the paper and took the number with it, so I am writing to the store and hoping.",
      "The news is: he came to my porch in June, ate like a congressman, and stayed. He is asleep on my boot as I write this. He is a good dog. He misses you at suppertime; the rest of the day, I confess, he seems to be getting along.",
      "No reward needed. Come see him, or don't, and know he's well. Either way the porch light is on.",
    ],
    sign: "— W. Odom",
  },
  {
    to: "Master Danny Kubek\n722 Cherry Street\n(or wherever he is now)",
    from: "Grandma\n(you know the address)",
    stamp: "No Longer at This Address",
    postmark: ["Dead Letter", "Office", "Dec 1969"],
    body: [
      "Every December I knit you mittens, and every December they come back to me with a different rubber stamp on the envelope. You are somewhere being twenty-six years old, and I am told boys that age do not lose mittens the way they used to.",
      "I knit them anyway. It is not really about the mittens, Danny, but you will not know that for another thirty years, so: they are blue, and there is a dollar in the left one, same as ever.",
    ],
    sign: "— Grandma",
  },
  {
    to: "Mr. A. Brandt\n(measurements on file)",
    from: "Mandel & Sons, Tailors\nMain at Third",
    stamp: "Unclaimed",
    postmark: ["Dead Letter", "Office", "May 1961"],
    body: [
      "Your suit is ready. It has been ready since the 9th of March, 1953, when you were called away in the middle of the second fitting.",
      "Styles have changed twice since then; I have quietly kept the lapels current. My son says to sell it. But you paid your deposit, and a deposit is a promise on both ends.",
      "It will fit you. That is the part I cannot explain to my son — every year I take it in or let it out a little, on a guess, and I have never once doubted the guess.",
    ],
    sign: "— E. Mandel, of Mandel & Sons",
  },
  {
    to: "Whoever lives at\n40 Linden Street now",
    from: "The previous tenant\n(the one with the trowel)",
    stamp: "Occupant Declined",
    postmark: ["Dead Letter", "Office", "Oct 1984"],
    body: [
      "Under the south fence, about a hand deep, there are two hundred daffodil bulbs I planted the autumn before we had to sell. Nobody knows they are there but you and me.",
      "I am not asking anything. Only — some March, when the yellow comes up out of nowhere in a line clear to the gate, you will wonder. It was on purpose. All of it was on purpose.",
    ],
    sign: "— The previous tenant",
  },
  {
    to: "The Sexton\nSt. Ambrose (the stone one\non the hill)",
    from: "C. Loach\nformerly your bell-ringer",
    stamp: "Parish Consolidated",
    postmark: ["Dead Letter", "Office", "Apr 1977"],
    body: [
      "Forty-one years I rang the changes, and the doctors say that is where the hearing went, and I want you to know I signed off on the trade and would again.",
      "My ask is small: Sunday mornings, would you leave the tower door open while they ring? My granddaughter drives me to the bottom of the hill. I cannot hear the bells anymore, but I can feel them in the car door, and that is most of it, if anyone asks.",
    ],
    sign: "— C. Loach",
  },
  {
    to: "The Management\nThe Rialto Theater\n(closed Tuesdays)",
    from: "Your projectionist\n(the booth)",
    stamp: "Theater Dark",
    postmark: ["Dead Letter", "Office", "Jul 1958"],
    body: [
      "For eleven years I have spliced one frame of a sunset into every newsreel. Nobody ever noticed, but the whole house breathes different for a moment, and that was me.",
      "Take it out of my wages.",
    ],
    sign: "— The booth",
  },
  {
    to: "Miss E. Calloway\nc/o the District Schools\n(she taught the 4th grade)",
    from: "R. Pfeiffer\n(a grown man now)",
    stamp: "Retired — No Forwarding",
    postmark: ["Dead Letter", "Office", "Sep 1981"],
    body: [
      "In October of 1949 the window of Room 6 was broken by a snowball with a rock in it, and Gerald Stroud was kept in for it every recess of that winter. It was not Gerald. I let a boy freeze indoors for my aim.",
      "You told us a man's character is what he does when nobody is looking. I was looking, ma'am. It took thirty-two years, but here is a dollar for the glass, and interest, and this.",
    ],
    sign: "— R. Pfeiffer, Room 6",
  },
  {
    to: "The War Department\nMedals Section\nWashington, D.C.",
    from: "F. Aldous\n(formerly Sergeant)",
    stamp: "Section Reorganized",
    postmark: ["Dead Letter", "Office", "Nov 1955"],
    body: [
      "Enclosed are two medals awarded to me in error. The citation says I held the ridge. The truth is I got lost in the smoke, sat down against what I took for a wall, and it was the ridge, and the war walked past me twice.",
      "I have carried them ten years and they have gotten heavier every year, which is not how metal behaves. Give them to somebody who was where he meant to be. Or to nobody. They were fine ribbons, and I am sorry.",
    ],
    sign: "— F. Aldous, formerly Sergeant",
  },
  {
    to: "The Operator\nThe carousel at\nLakeview Amusement Park",
    from: "M. (age 61)\n(formerly age 7)",
    stamp: "Park Demolished",
    postmark: ["Dead Letter", "Office", "Jun 1990"],
    body: [
      "There was a white horse on the outside ring with a chipped ear and a green saddle, and in 1936 I named him Colonel and told him things I have never told anyone since.",
      "I read they auctioned the horses when the park came down. I am not trying to buy him. I only want whoever winds up with the Colonel to know that he has heard a little girl's whole heart once, and to please dust his ear gently.",
    ],
    sign: "— M.",
  },
  {
    to: "Whoever lost a gold ring\nin the sea\n(inscribed: 'til the tide turns)",
    from: "Mrs. N. Behan\nthe fish counter, Sat. mornings",
    stamp: "Inscription Insufficient",
    postmark: ["Dead Letter", "Office", "Mar 1971"],
    body: [
      "On Friday last I opened a cod of ordinary appearance and found your wedding band inside, which the fish had carried, I am told, from anywhere at all.",
      "The jeweler says 1921 by the hallmark. If the marriage outlived the ring, come to the fish counter Saturdays and describe the hand it fit. If it did not — I polish it Sundays, and it is having a better time than most rings.",
    ],
    sign: "— Mrs. N. Behan",
  },
  {
    to: "The Town of Peavine\n(all of it)\nformerly off Route 12",
    from: "The cartography dept.\nOverland Atlas Co.",
    stamp: "No Such Town",
    postmark: ["Dead Letter", "Office", "Feb 1963"],
    body: [
      "In the 1958 edition our draftsman left you off the state map — an error of ink, nothing more, and we apologize. We restored you in 1961.",
      "But we are obliged to report that in the meantime your population went from 91 to 40, and our surveyor writes that the hardware store is closed and will not say more. We have put you back exactly where you were. Towns are asked to do the same, and we understand if that is no longer possible.",
    ],
    sign: "— Overland Atlas Co., Corrections",
  },
  {
    to: "Mr. O. Quill\nthe yellow house\npast the second bridge",
    from: "Census enumerator\nDistrict 11",
    stamp: "House Counted, Not Found",
    postmark: ["Dead Letter", "Office", "Jul 1960"],
    body: [
      "Sir: in April I counted you. We spoke at your gate about the dry spring, you gave your age as 44 and your occupation as beekeeper, and I wrote it down and tipped my hat.",
      "The office informs me there is no yellow house past the second bridge and no record of any Quill in this county, living or otherwise. I am required to strike you from the rolls. I am striking you from the rolls, sir, but not from anything else. The bees were real. I have the sting to show.",
    ],
    sign: "— Enumerator, District 11",
  },
  {
    to: "The next man to wear\na brown wool overcoat\n(donated, St. Vincent's)",
    from: "The former Mrs. T.",
    stamp: "Bin Emptied",
    postmark: ["Dead Letter", "Office", "Jan 1986"],
    body: [
      "The coat was my husband's. Before you ask: yes, the pockets. Left: a theater stub from 1949 and a smooth stone from a beach I could name but won't. Right: a grocery list in his hand — bread, thread, bulbs — which I have decided you should keep.",
      "He warmed it for thirty-seven years. It runs a little warm still, is my belief. Wear it somewhere he'd approve of: anywhere at all, with weather.",
    ],
    sign: "— The former Mrs. T.",
  },
  {
    to: "Miss Patsy Greer\n(age 9, as of the sending)\nthe Greer farm",
    from: "T. Colby, orchardist",
    stamp: "Farm Sold Twice Since",
    postmark: ["Dead Letter", "Office", "Oct 1978"],
    body: [
      "In the fall of 1954 your balloon came down in my orchard with a tag asking WHOEVER FINDS THIS to please write back and say how far it flew. Signed, Patsy, age 9.",
      "It flew eleven miles. I did not write because eleven seemed a small number for so much string and hope, and I put the tag in a drawer, and the drawer became twenty-four years.",
      "It has bothered me at odd hours ever since. Eleven miles, Patsy. But it cleared two rivers and the county line, and it beat every balloon I ever heard of, and I am sorry to be late.",
    ],
    sign: "— T. Colby, orchardist",
  },
  {
    to: "The Editor\nThe Old Homestead Almanac\n(in confidence)",
    from: "Your long-range\nweather correspondent",
    stamp: "Opened by Mistake",
    postmark: ["Dead Letter", "Office", "Dec 1973"],
    body: [
      "You have paid me thirty dollars a year since 1948 for the long-range forecasts, and the time has come to tell you my method, which my conscience and my doctor both advise. There is no method. I sit on the porch in August and decide how the winter feels.",
      "I am right about as often as the government, which costs considerably more. Still, a man wants to confess something before he goes. Print next year's mild. It feels mild.",
    ],
    sign: "— Your weather man",
  },
  {
    to: "The children of\nHarmon Street School\n(1949 through 1974)",
    from: "Albert\n(the corner of Fifth)",
    stamp: "School Rezoned",
    postmark: ["Dead Letter", "Office", "Jun 1974"],
    body: [
      "Twenty-five years I walked you across Fifth Street, and by my arithmetic that is one hundred eleven thousand crossings and no losses, which I will put up against any record in this county.",
      "You are bankers and farmers and one of you is a judge now, and you still cross at my corner some mornings, grown huge, checking both ways like I taught you. That checking is mine. That is my monument, and you all carry it.",
    ],
    sign: "— Albert, the corner of Fifth",
  },
  {
    to: "The County Clerk\nCourthouse\nAttn: Records",
    from: "Miss Birdie Pell\n(age 8), the Pell place",
    stamp: "No Applicable Form",
    postmark: ["Dead Letter", "Office", "Jul 1965"],
    body: [
      "Enclosed please find my census of the fireflies in our bottom field, taken the night of July 4th: four thousand and six, or possibly four thousand and seven, as one blinked in a way I could not swear was one or two.",
      "My brother says they are not citizens. Kindly settle a bet: it seems to me anything that shows up every summer, works all night, and asks for nothing should be counted as something.",
    ],
    sign: "— Miss Birdie Pell, age 8",
  },

  /* ---- the shelf-box strata (2026-07-30, James's ask: what's IN the archive
     boxes — Santa ×5, chains ×3, divorce ×3, evictions ×3, resignations ×2,
     confessions ×5) ---- */
  {
    to: "Mr. S. Claus\nThe North Pole\n(the main office)",
    from: "Wendell R. Petty\n(age 8), 14 Ash Street",
    stamp: "No Route North",
    postmark: ["Dead Letter", "Office", "Dec 1954"],
    body: [
      "I have it from Carol Ann Mackey that I am on the naughty list, and I am writing to dispute it. The cellar window was broken by Douglas Fett. The gum in Carol Ann's hair arrived there by accident of wind. Witnesses are available, except Douglas.",
      "I have been good since Halloween by any fair measure, and I would ask that the record reflect it. I want the fire engine with the ladder that cranks.",
      "If the list cannot be amended at this date, I understand, and will pursue the matter next year.",
    ],
    sign: "— Wendell R. Petty, age 8",
  },
  {
    to: "Santa Claus\nThe North Pole\n(please hurry)",
    from: "Miss Alma Frisk\n(age 7)",
    stamp: "Address Outside Routes",
    postmark: ["Dead Letter", "Office", "Dec 1952"],
    body: [
      "Do not bring me anything this year. Put it all toward my dad, who is in Korea, which mama shows me on the map with her finger.",
      "If he cannot fit in the sleigh with the toys, I have drawn our house on the back of this letter, with the porch light on, so you can show him what it looks like in case he has trouble remembering. It is the house with the dog.",
    ],
    sign: "— Alma, age 7 (the house with the dog)",
  },
  {
    to: "Santa Claus\nThe North Pole\n(attention: back orders)",
    from: "G. Maddox\n(age 61)",
    stamp: "Order Not on File",
    postmark: ["Dead Letter", "Office", "Dec 1949"],
    body: [
      "In December of 1899 I wrote you regarding a red sled with iron runners. I never heard back, and I am following up, as fifty years seems long enough to wait politely.",
      "I no longer require the sled. The hill has houses on it now anyway. I am writing mostly to keep the correspondence open, as you are the only one I ever wrote to who might still be there.",
    ],
    sign: "— G. Maddox, formerly age 11",
  },
  {
    to: "S. Claus (if applicable)\nThe North Pole",
    from: "Roger Blum\n(age 9), the Blum house",
    stamp: "Conditionally Addressed",
    postmark: ["Dead Letter", "Office", "Dec 1961"],
    body: [
      "My friend Carl says you are not real, and my sister says grow up, and my mother says finish your plate, which is not an answer.",
      "I am not asking questions. I am just saying the milk and cookies arrangement continues at our house either way, no hard feelings, whatever the truth turns out to be. A man can leave a light on without knowing who comes.",
    ],
    sign: "— Roger Blum, age 9",
  },
  {
    to: "Santa Claus\nThe North Pole\n(private)",
    from: "Dorothy Cade\n(age 10)",
    stamp: "Marked Private",
    postmark: ["Dead Letter", "Office", "Dec 1958"],
    body: [
      "Please skip our house this year. Daddy's plant is on strike and mama cries at the Sears book, and I am old enough to know, but my brother Petey is not.",
      "So skip us, but here is the important part: tell Petey the sleigh broke down. Do not tell him the true reason. He is five and he thinks the world is good, and I am working hard to keep him that way as long as I can.",
      "If you have anything spare, he likes red.",
    ],
    sign: "— Dorothy Cade, age 10",
  },
  {
    to: "Mrs. H. Plum\n6 Orchard Lane\n(sixth of six)",
    from: "(the chain)",
    stamp: "Chain Ends Here",
    postmark: ["Dead Letter", "Office", "Apr 1936"],
    body: [
      "This letter has gone around the world eleven times since 1911. Copy it six times within six days and good fortune follows: Mrs. Reese of Joliet copied it and found five dollars in an old coat. Do not break the chain: Mr. Pole of Duluth broke it, and his hat blew into the river, and then his other hat.",
      "Do not ask what the letter is for. The letter is for continuing. It is the oldest kind of letter there is.",
    ],
    sign: "— (copy exactly)",
  },
  {
    to: "The Sender\nof the six-copies letter\n(up the chain)",
    from: "E. Grandy\n(age 84)",
    stamp: "Refused — Chain Broken",
    postmark: ["Dead Letter", "Office", "Jun 1957"],
    body: [
      "I received your letter instructing me to copy it six times or invite misfortune. I decline. I am eighty-four years old. I have buried two husbands, outlived a flood, and once shook the hand of a president I did not care for. Whatever is coming for chain-breakers, I would like to see it try.",
      "I am returning your luck unused. Spend it on the young. They frighten easier.",
    ],
    sign: "— E. Grandy",
  },
  {
    to: "Mr. Harold Beemis\n11 Water Street\n(you are the sixth)",
    from: "Your neighbor Gus\n(I panicked)",
    stamp: "Delivery Declined",
    postmark: ["Dead Letter", "Office", "Oct 1964"],
    body: [
      "By now you have seen the enclosed letter demanding six copies in six days. Harold, I am sorry. The other five went to strangers out of the phone book, but the instructions were strict about six, and midnight was coming, and yours was the only other name I could think of. I panicked.",
      "You may break the chain and take your chances, or copy it and lose an evening as I did. Either way, please still come Thursdays for cards. Whatever bad luck follows me, it knows about Thursdays, and has always been welcome.",
    ],
    sign: "— Gus, next door",
  },
  {
    to: "Mrs. I. Vance\n(address on file\nno longer good)",
    from: "Lundgren & Son\nAttorneys-at-Law",
    stamp: "Addressee Unknown",
    postmark: ["Dead Letter", "Office", "Sep 1962"],
    body: [
      "He keeps the truck; you keep the piano; the dog alternates. The quilt your mother made for the wedding bed is enclosed — neither party would claim it, and neither would let the other have it. Our firm cannot keep it. It is too warm a thing to file.",
    ],
    sign: "— Lundgren & Son, Attorneys",
  },
  {
    to: "The Clerk of Court\nDomestic Filings\nCounty Courthouse",
    from: "N. Ostrow\n(the respondent)",
    stamp: "Filing Incomplete",
    postmark: ["Dead Letter", "Office", "May 1955"],
    body: [
      "You will find everything signed where the little pencil marks told me to sign. I have signed away the house, the acreage, and my Sundays, all in blue ink, all legible, as instructed.",
      "I did not complete page four, where the form asks for the reason in the space provided. Twenty-two years, and the space provided is three inches long. I have no reason that fits. Return the form to me when the county prints an honest one.",
    ],
    sign: "— N. Ostrow",
  },
  {
    to: "Mr. & Mrs. C. Hobb\n(jointly, one last time)\nRural Route 4",
    from: "Office of the\nCounty Clerk",
    stamp: "Decree Unclaimed",
    postmark: ["Dead Letter", "Office", "Aug 1960"],
    body: [
      "Your final decree has been ready for collection since March of 1949. Eleven years. Neither party has come for it. The county does not presume to know its citizens' hearts, but the clerk notes you were both seen at the fair in August, sharing a candy apple, and that Mrs. Hobb won the pie contest and Mr. Hobb held her coat.",
      "The decree remains in our drawer. It keeps fine. Kindly advise, or kindly don't.",
    ],
    sign: "— Office of the County Clerk",
  },
  {
    to: "Mr. T. Wozniak\nApt. 2 rear, the shoe man\n22 Dill Street",
    from: "A. Kravitz\n(your landlord)",
    stamp: "Tenant Unmoved",
    postmark: ["Dead Letter", "Office", "Mar 1959"],
    body: [
      "Paragraph one: you are hereby given thirty (30) days' notice to vacate for nonpayment, as required by my son, who has taken over the building's affairs and its letterhead.",
      "Paragraph two, from me: ignore paragraph one. Nobody is going anywhere while I am alive. You fixed my roof in '44 for nothing, and a man's ledger has more than one column in it. Pay when the shoe shop pays you.",
      "Do not show my son this letter.",
    ],
    sign: "— A. Kravitz, the actual landlord",
  },
  {
    to: "The Swallows\nresident in the eaves\nCounty Courthouse (north)",
    from: "Office of the\nTown Clerk",
    stamp: "Occupants Airborne",
    postmark: ["Dead Letter", "Office", "Apr 1966"],
    body: [
      "You and your issue are hereby directed to vacate the courthouse eaves no later than April the 1st, pursuant to the building committee's resolution of last fall, the same as the resolution of the six falls before it.",
      "The clerk is required to serve this notice and has done so by reading it aloud from the steps, feeling foolish. Enforcement has been attempted twice, by ladder. The committee is aware of your position. You return on or about April the 9th, and the matter is continued another year.",
    ],
    sign: "— The Town Clerk, resigned to it",
  },
  {
    to: "The Commander\nFORT DEFIANCE\n(the elm, trackside)",
    from: "Great Plains & Western\nRailroad, Land Office",
    stamp: "Fort Holds",
    postmark: ["Dead Letter", "Office", "Jul 1953"],
    body: [
      "The structure known as FORT DEFIANCE, erected in the trackside elm at mile 214 without permit, must be removed within sixty days. This is the railroad's third notice.",
      "The Land Office acknowledges your reply to the second notice, consisting of one (1) arrowhead and a drawing of the fort's cannon. The railroad finds your counteroffer persuasive but insufficient, and notes for the record that the cannon appears to be a stovepipe.",
      "Our inspector reports the fort is well kept and flies its flag in all weathers. Sixty days, gentlemen. The railroad has been young too.",
    ],
    sign: "— Land Office, GP&W RR",
  },
  {
    to: "The Selectmen\nTown Hall\n(all five of them)",
    from: "H. Pruitt\nCounty Dog Warden",
    stamp: "Position Since Filled",
    postmark: ["Dead Letter", "Office", "Oct 1958"],
    body: [
      "I resign as dog warden, effective the first hard frost. In nine years I have caught three hundred and forty dogs and returned three hundred and forty dogs, many of them the same dog, one of them eleven times.",
      "I have come to understand that the dogs and I are engaged in a game, that the game has rules I was never shown, and that the dogs are winning. A man should not hold a public office his heart has changed sides on.",
      "I recommend for the post anyone who runs slower than me. The dogs prefer it close.",
    ],
    sign: "— H. Pruitt",
  },
  {
    to: "Chief Engineer\nVolunteer Hose Co. No. 1",
    from: "S. Dubcek\n(badge 4)",
    stamp: "Never Accepted",
    postmark: ["Dead Letter", "Office", "Nov 1971"],
    body: [
      "Forty-one years with the company, and the doctor and the ladder have come to an agreement over my head: I am done climbing. Consider this my resignation, tendered with a full heart and a bad knee.",
      "One condition, and I will hold the company to it: my boots stay by the engine, third peg. They know the way to a fire by themselves now, and some green kid is going to be glad of boots that pull toward the smoke.",
    ],
    sign: "— S. Dubcek, badge 4",
  },
  {
    to: "The Editor\nThe Weekly Courier\n(letters column)",
    from: "(a man with a wagon)",
    stamp: "Author Unknown",
    postmark: ["Dead Letter", "Office", "Feb 1968"],
    body: [
      "For twenty-two winters somebody has stacked split firewood on the porches of this town's widows in the night, and for twenty-two winters your paper has run guesses every February. It was me. The mystery can retire; my back already has.",
      "I am confessing so the town stops crediting angels for what was only a man with a wagon and a reason he never gave. The reason was a porch I sat on cold, once, a long time ago, waiting for help that took its time. That is all the reason there ever is.",
    ],
    sign: "— (the wagon is sold)",
  },
  {
    to: "The Congregation\nFirst Methodist\n(the one with the tower)",
    from: "L. Fenwick\n(now of Ohio)",
    stamp: "No Longer in Parish",
    postmark: ["Dead Letter", "Office", "Jun 1963"],
    body: [
      "The tower clock has said 7:22 since the autumn of 1946, and the town has made its peace with it, and I understand there is now a café called The Seven Twenty-Two. It was me. I climbed up on a dare with my cousin's .22 — the arithmetic of that has not escaped me — and I hit the works with the second shot.",
      "I am told the town says the clock stopped the hour the war ended, or the hour old Reverend Miles died, depending who is talking. Both are better stories than mine. Keep either. But I wanted one soul on earth to hold the true one.",
    ],
    sign: "— L. Fenwick",
  },
  {
    to: "The Membership\nOtter Tail Rod & Gun Club\n(read at the meeting)",
    from: "C. Yost\n(the record holder)",
    stamp: "Delivery Refused",
    postmark: ["Dead Letter", "Office", "Mar 1970"],
    body: [
      "The brass plate over the bar says C. Yost, largemouth bass, eleven pounds four ounces, June 1953. I am writing to report there were three lead sinkers in that fish, and the fish and I both knew it.",
      "Seventeen years that plate has looked at me every Friday night. Take it down, or leave it up as a monument to the sinkers, whichever the membership prefers. Either way I have paid: I have not enjoyed a fish since, and I used to love fish.",
    ],
    sign: "— C. Yost",
  },
  {
    to: "The Town of Coulter\nAttn: Historical Society",
    from: "The estate of\nA. Brazda, sculptor",
    stamp: "Society Disbanded",
    postmark: ["Dead Letter", "Office", "Sep 1975"],
    body: [
      "Our father cast the statue of your founder, Colonel Coulter, in 1928. Going through his papers we find an envelope marked FOR THE TOWN, WHEN I AM GONE, and in it this: no photograph of the Colonel existed. The face on your statue is our father's father, a tailor from Moravia, who never set foot in your county but had, our father writes, the correct jaw.",
      "For forty-seven years your town has laid wreaths at the feet of a man who mended coats. Our father kept the secret and the commission. We see no reason to unveil anything now, except that the tailor deserves the wreaths on the record somewhere. They would have astonished him.",
    ],
    sign: "— The Brazda family",
  },
  {
    to: "The Choir Director\nFirst Lutheran\n(soprano section)",
    from: "Mrs. G. Sorley\n(third row, aisle end)",
    stamp: "Unopened by Request",
    postmark: ["Dead Letter", "Office", "Dec 1972"],
    body: [
      "Thirty-one years in your choir, and here is my confession: I lost the voice in 1941, after the diphtheria, and never told a soul. I have mouthed every anthem since. Thirty-one years of Holy, Holy, Holy, silent as snow.",
      "I stayed because the robes are warm and the third row is the only place I have ever stood shoulder to shoulder with people and felt the music go through me like weather. You may put me out. But I ask you to consider that nobody has ever once noticed, and what that says about how a choir actually works.",
    ],
    sign: "— Mrs. G. Sorley",
  },

  /* ---- the length strata (2026-07-31, James: "a lot more variety in the
     length... that's what would be more realistic" — scraps, notes, one list,
     and four sagas; the letter panel scrolls past 88vh) ---- */
  {
    to: "Mr. E. Skoglund\n(wherever this finds him)",
    from: "(the house on Alder Street)",
    stamp: "Found No One",
    postmark: ["Dead Letter", "Office", "Mar 1949"],
    body: [
      "Come home.",
    ],
    sign: "— everyone",
  },
  {
    to: "Mr. J. Quist\nc/o the Harvest Dance\n(ask anyone)",
    from: "(you know who)",
    stamp: "Dance Concluded",
    postmark: ["Dead Letter", "Office", "Sep 1950"],
    body: [
      "Yes.",
    ],
    sign: "— (still yes)",
  },
  {
    to: "The Clerk of Court\nDomestic Filings",
    from: "Mrs. F.\n(in haste)",
    stamp: "Overtaken by Events",
    postmark: ["Dead Letter", "Office", "Jul 1956"],
    body: [
      "File it before he apologizes again.",
    ],
    sign: "— Mrs. F.",
  },
  {
    to: "The Milkman\n(route 6, the early one)",
    from: "The Hollisters\n(the porch with the pail)",
    stamp: "Route Discontinued",
    postmark: ["Dead Letter", "Office", "May 1962"],
    body: [
      "Leave one extra bottle from now on, for the cat that is not ours. Bill us as usual and say nothing to the Neelys.",
    ],
    sign: "— The Hollisters",
  },
  {
    to: "Lost & Found\nUnion Depot",
    from: "O. Lindqvist",
    stamp: "Not Found",
    postmark: ["Dead Letter", "Office", "Jan 1954"],
    body: [
      "One glove, brown leather, left hand, lost on the 4:15 six years ago. I have kept the right. It has become a matter of principle.",
    ],
    sign: "— O. Lindqvist",
  },
  {
    to: "Santa Claus\nThe North Pole",
    from: "Gene Mackey\n(age 8)",
    stamp: "Postage: Two Caps",
    postmark: ["Dead Letter", "Office", "Dec 1958"],
    body: [
      "Dear Santa, here is the list.",
      "1. The air rifle. You know the one.",
      "2. Hockey skates, size 5 to grow into, Mom says.",
      "3. A compass.",
      "4. The volcano book, not the baby one.",
      "5. Caps. All the caps you can spare.",
      "6. Something good for Petey Cade next door. Ask around about why.",
      "7. A flashlight.",
      "8. Batteries. I have learned that lesson.",
      "9. No socks. If the elves have already made the socks, fine. But know that I know.",
      "10. Whatever my mom wants. She never says. She fixes everybody's plate and sits down last. Figure it out, you're the professional.",
    ],
    sign: "— Gene Mackey, age 8",
  },
  {
    to: "The estate of A. Gorczak\n(the lawyers handling it)",
    from: "E. Piatek\nthe adjoining forty",
    stamp: "No Executor Found",
    postmark: ["Dead Letter", "Office", "Jun 1969"],
    body: [
      "To the lawyers handling Anton Gorczak's affairs: I am told you are collecting statements regarding the boundary dispute. Here is the complete record, kept accurate, as he would want it kept.",
      "1934: Anton moved the line fence one foot onto my land while I was at my brother's wedding. I moved it back two.",
      "1935: he moved it back one and a half, and reseeded my clover wrong out of spite. The clover came in better than my own. I have never forgiven him.",
      "1936: I painted my side of the fence. He painted his side a better color, which he then would not name. It took me until Easter to match it.",
      "1937: the hailstorm. We did not fight that year. His barn lost its roof and my horses stood in his parlor for six days. The fence stood in water to the second rail.",
      "1938 through 1941: skirmishes too numerous to list. See the diagram. The diagram is his; he drew fences truer than any man in this county, and it is the one thing I ever told him to his face.",
      "1942: both boys shipped out — his Frank, my Walter. Anton and I mended fence together that spring without one word passing. Best fence we ever built. A man can say a great deal with a post maul, and we said all of it.",
      "1943: Frank did not come home. That fall I moved my fence one foot onto my own land, so his cows could reach the creek shade. We never spoke of it. He never moved it back.",
      "1951: the tornado took my fence entire, and Anton Gorczak rebuilt it in three days, on the old true line, to the inch, while I lay with a broken hip cursing him from the window. He billed me one dollar. I did not pay it, on principle, and he sent that bill every Christmas after, and it is how I knew he was well.",
      "1962: too old to farm the back forties, the both of us, we rented to the Lindstrom boy, who took the fence down to run the parcels as one field. Anton and I stood where the line had been and could not find it. He said, 'Well.' I said, 'Well.' We stood there a long time. There has never been a bigger field.",
      "This Christmas the bill did not come, and I knew that too.",
      "So, to the lawyers: there is no dispute. There was never a dispute. There was a fence, and two old fools who kept it in perfect repair for thirty-five years, and if your papers require a finding, write down that the line is wherever Anton Gorczak said it was.",
      "Enclosed is one dollar.",
    ],
    sign: "— E. Piatek",
  },
  {
    to: "The buyer of box lot 40\nestate sale, the Hyde place\n(the black tin with roses)",
    from: "The eldest daughter",
    stamp: "Sale Concluded",
    postmark: ["Dead Letter", "Office", "Sep 1980"],
    body: [
      "You bought my mother's sewing box at the sale on Saturday — lot 40, one dollar fifty. The auctioneer called it 'notions.' I was the woman by the porch rail who could not make herself bid. Before it is only buttons to you, I want one person on earth to have the inventory.",
      "The needle book, wool felt, shaped like a house: she made it at nine years old, in Norway, before the boat. It is the oldest thing our family owns. Owned.",
      "The blue spool: the thread she basted my wedding dress with, and my sister's. She let mine out twice and took my sister's in once, and what that arithmetic says about our marriages she never once said out loud.",
      "The scissors we were forbidden to touch, which cut paper NEVER, and which every one of us used for paper, and she knew every time. She could hear it from two rooms. Paper has a sound, she said. So do liars.",
      "The pincushion tomato. Science has no explanation for why they are tomatoes. Neither did she, and she distrusted the question.",
      "The milk-glass button jar. On winter Sundays we sorted it on the rug — by size, then by color, then back in the jar — and I was forty years old before it occurred to me that the sorting was never for anything. It was to keep four children still in one room where she could count us. She was sorting us.",
      "The darning egg, worn smooth as a chestnut. She held it in her fist the last week, in the hospital, when she did not know our names anymore. She knew the egg. A nurse asked what it was and I said: a tool — you hold it inside the sock, where the hole is, so the mending has something to press against. Write that down somewhere. It is not only for socks.",
      "The thimble, worn through at the top. The hardware man told her a worn-through thimble means ten thousand hours, and she said, 'Then it owes me nothing,' and bought no new one, and pushed the needle sideways with her ring finger for the last eleven years. It is why every sweater this family owns pulls a little to the left. We are a crooked people, and it is documented in wool.",
      "That is the inventory. Keep it together in the tin, is my only ask. It is one lot. It was one life, a dollar fifty, and the auctioneer was righter than he knew: those were her notions — that a hole is a thing you press against from the inside; that children hold still if you sort them gently; that paper has a sound, and so do liars.",
      "Use the scissors for whatever you want. She can hear you.",
    ],
    sign: "— the woman by the porch rail",
  },
  {
    to: "The Town Council\n(for the record)",
    from: "N. Brozek\nnight watchman (the last)",
    stamp: "Position Abolished",
    postmark: ["Dead Letter", "Office", "Oct 1964"],
    body: [
      "To the Council: I am told the town has voted to discontinue the position of night watchman, the streetlights being judged sufficient. Very well. Enclosed is my final report, one complete shift, submitted in full, so the record shows what the streetlights will be doing instead of me.",
      "9:00. Walked Main from the depot to the church. Tried every door twice. Locked, all, as they have been since 1949, when Elmer at the hardware left his open on purpose after we argued about whether I check.",
      "10:00. The Pyle dog began at the moon, per schedule. Stood with him a while at the gate. He does not bark at the moon when he has company. No one has ever asked what the barking is for, except me. It is for the company.",
      "11:00. Lights out at the hotel, all but room 9, which is a salesman practicing his figures out loud at the window. He is bad at them. I have started rooting for him.",
      "12:00. Checked the mill pond gate. Confiscated two of the four cigarettes hidden in the usual place under the footbridge. Two and not four is town diplomacy: enough gone that the boys know somebody knows, enough left that they keep the spot where I can find it.",
      "1:00. The Hedstrom kitchen light, burning late, per every Tuesday. Her husband drives the milk route Wednesdays and she cannot sleep the night before an empty bed, so she irons. Forty years I have kept that light company from the street and she has never known it. Tell her or don't. She irons beautifully. You can see the steam.",
      "2:00. Nothing. I want the record to show how much of this job was nothing, and that I was there for all of it. Nothing does not happen by itself. Nothing takes attendance.",
      "3:00. Talked the Verlan boy down out of the war memorial elm, where he goes when his father drinks, and walked him home the long way, per our arrangement. The long way is long enough that he is asleep on his feet by the porch and does not hear whatever there is to hear inside. The long way is the whole job, gentlemen, if you are keeping track of what the streetlights will need to learn.",
      "4:00. Freight through at 4:11, on time. Waved at the brakeman. I do not know his name; I have waved at him nine years. Somewhere a man I never met says of us, 'that is the town where the fellow waves.' That is a kind of streetlight too, I would argue, and I am arguing.",
      "5:00. First light at the bakery; the smell by 5:20. Gustafson hands the first burnt roll out the back door to whoever is standing there. For nine years that has been me. Starting next week it is nobody. He will hold it out anyway, is my guess. A door gets a habit.",
      "6:00. Rang off at the depot. Handed in the clock and the key. That clock has punched every hour of mine since 1924; we retire disagreeing about how many that is.",
      "Report ends. All was well. All was almost always well, gentlemen — that was never the news down here. The news was that somebody checked.",
    ],
    sign: "— N. Brozek, badge 1 (there was only ever the one)",
  },
  {
    to: "Miss Karin Holm\n(my granddaughter)\nleft no forwarding",
    from: "Grandma Holm",
    stamp: "Forwarding Expired",
    postmark: ["Dead Letter", "Office", "Nov 1976"],
    body: [
      "You called long distance, which is money, to ask for the cardamom bread the way I make it, and then you moved before I could write it down for you. Here it is anyway. It will find you or it won't, which is how it goes with bread too.",
      "First: two cups of milk, scalded. Watch it. Scalded is the moment before the moment you were about to look away.",
      "The yeast: prove it in a little of the warm milk with a spoon of sugar. If it does not foam, throw it out and start over, and do not mourn yeast. This applies broadly. I was first courted by a man with a borrowed boat and good posture. The boat did not foam. I started over with the man who became your grandfather, and to his last day he thanked that boat.",
      "Cardamom: eleven pods, crushed yourself, in the cloth, with the rolling pin. Not powder from a can. The can is fine for people you like. The pods are for people you love. That is the whole of my philosophy, and now you have it.",
      "Flour: begin with five cups, but the dough decides. Your mother always fought the dough. You cannot fight dough, Karin — it has no pride, it simply waits. So did I, and she came around, and we baked every Christmas after. She came around late. Bread rises late in a cold house. It rises, though.",
      "Butter: the good butter. If the store man tells you the other kind is just the same, he has told you about butter and about himself.",
      "Knead until your arms burn, and then count a hundred more. It is the only part of my life anyone ever called patient. It is not patience if you get to hit something. But I let them call me patient.",
      "First rise: one hour under the flour-sack towel — the one with the windmill, bottom drawer of the hutch. The hutch is also yours someday. Your aunt does not know yet. This letter is my evidence.",
      "Braid in six strands. Your grandfather said six was showing off, and I said yes, and he lived another forty years and never asked again. Marry someone who understands the first time. Or at least stops asking.",
      "Egg over the top, pearl sugar, hot oven, twenty minutes, turn it once, and take it out when the whole kitchen smells like the inside of a church bell. You will know. You have always known things. You only call long distance to hear them said.",
      "Bake it wherever it is you have landed, and the smell will make the place yours. That is what the recipe is for, Karin. The bread is only how the smell travels.",
    ],
    sign: "— Grandma Holm (the towel is yours too — show your aunt this letter)",
  },
];

/* ================= the postmaster's lines (authored) ================= */

const PM_AMBIENT = [
  "Third shift is the only shift.",
  "That clock is right twice a day. This is one of them.",
  "We don't lose mail. We keep it differently.",
  "Everything down here is addressed to someone.",
  "The blue ones? Couldn't say where they go. Nobody's come back to complain.",
  "The basket is never full. We checked.",
  "Some of these are for buildings that burned down before I was born.",
  "You can read them. They stopped minding years ago.",
  "ZIP stands for something. I've forgotten what.",
  "The pigeonholes are alphabetical by regret.",
  "I stamped one twice, once. Nothing happened.",
  "The pipes only drip when you listen.",
  "Mail for the sea gets heavy. We double-bag it.",
  "Somebody upstairs keeps writing to the weather.",
  "The plant died in '78. We kept it on. Seniority.",
  "Requisitioned a new bulb in the spring. Some spring.",
  "The radiator speaks a little Morse. Mostly complaints.",
  "Every one of these was somebody's best try.",
  "The ink bottle is for signatures. Nobody signs.",
  "Dust is just mail that gave up.",
  // the 2026-08-10 recorded batch (James's ElevenLabs takes — these six were
  // written for the recording script and joined the ambient rotation with it)
  "Got one last month that was mailed from Duluth to Duluth. Took eleven years. So it saw a little of the country.",
  "You'd be surprised how many people forget what state their mother lives in. Course, sometimes that's deliberate.",
  "People complain the Postal Service is slow. Generally those people have never tried finding a man named Earl with no last name.",
  "Some people put 'URGENT' on the envelope. That's helpful. Gives us an idea how disappointed they'll be.",
  "My supervisor says I ought to clear some of this out. I told him I've only been here fifty years and I don't like making snap decisions.",
  "You can tell a love letter without opening it. Too much postage and absolutely no planning.",
];

/* saying one of these earns him the sigh */
const PM_SIGH_LINES = new Set([
  "Some of these are for buildings that burned down before I was born.",
  "Every one of these was somebody's best try.",
  "Dust is just mail that gave up.",
  "Somebody upstairs keeps writing to the weather.",
]);

const PM_CLICKED = [
  "Yes?",
  "Can I help you? No. But ask anyway.",
  "Don't lean on the desk.",
  "I'm on break. I've been on break since '91.",
  "Mind the basket.",
  "If it's about a package: no.",
  "You want the blue ink. Everyone wants the blue ink.",
  "I sort. I don't deliver. Delivery is a rumor.",
  "Poking the postmaster. Bold.",
  "This one's addressed to a lake. See my problem?",
  "Forms are in the drawer. The drawer is a lie.",
  "I'd offer you coffee, but the mug is load-bearing.",
];

const PM_SHIFT_LINES = [
  { at: 60, line: "One minute in. That's normal. That's fine." },
  { at: 180, line: "Three minutes. The mail appreciates the company." },
  { at: 300, line: "Five minutes. Most people have followed the blue ink out by now." },
  { at: 600, line: "Ten minutes. I could find you a chair. We had chairs once." },
  { at: 1200, line: "Twenty minutes. You work here now. That's how it happened to me." },
  { at: 1800, line: "Half an hour. I'll put you down for the pension. It's a drawer of stamps." },
  { at: 2700, line: "Forty-five minutes. The clock and I have stopped keeping score." },
  { at: 3600, line: "An hour. The office is yours at midnight. Don't feed the basket." },
];

/* new contextual pools for the walking shift (2026-07-21) */
const PM_FURNACE_LINES = [
  "Past saving. The furnace has opinions about what saving means.",
  "Regulation twelve: overflow becomes heat.",
  "These ones warm the place twice.",
];
const PM_COFFEE_LINES = [
  "The pot is from '79. Possibly the coffee too.",
  "Black. Like the outgoing tray.",
];
const PM_CLOCK_LINES = [
  "Still on the clock. The clock and I punch each other.",
  "Punched in during the Ford administration.",
];
const PM_FILE_LINES = [
  "Filed under eventually.",
  "This one goes under R, for regret.",
];
const PM_BASKET_EMPTY_LINES = [
  "Basket's quiet. It's saving up.",
  "Nothing to sort. Suspicious.",
];
const PM_CORKBOARD_LINES = [
  "Notice 44-C. Still in effect.",
  "Green sticker means it's fine. It's never green.",
  "Somebody keeps pinning the same memo. It's me.",
];
const PM_CABINET_LINES = [
  "A through M. The rest is estimates.",
  "Every drawer is the miscellaneous drawer.",
  "That one's been open since '85. We respect its decision.",
];
const PM_POKE_LINES = [
  "Just checking it's still hungry.",
  "It likes the poker. Nobody else does.",
];
const PM_DOOR_RETURN_LINES = [
  "Upstairs is still there. Unfortunately.",
  "Checked the top of the stairs. Still stairs.",
  "Break's over. It never started.",
];
const PM_DONUT_LINES = [
  "The donuts are from a Tuesday.",
  "Powdered. Like everything down here.",
];
const PM_COUCH_LINES = [
  "We had chairs once. Now we have this.",
  "Five minutes. The mail can practice patience.",
  "Best seat in the office. Only seat that counts.",
];

/* ================= DOM, renderer, scene ================= */

const stage = document.getElementById('stage');
const poster = document.getElementById('poster');
const posterNote = document.getElementById('poster-note');
const bubbleEl = document.getElementById('bubble');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

function fail(msg) {
  if (posterNote) posterNote.textContent = msg;
  console.warn('[dlo]', msg);
}
const SERVE_HINT = 'The office needs the local server — one double-click on start-elastic-space.cmd.';

let renderer;
try {
  renderer = new THREE.WebGLRenderer({
    canvas: stage, antialias: true, powerPreference: 'high-performance',
  });
} catch (e) {
  fail('WebGL is unavailable here — the letters wait all the same.');
  throw e;
}
// Dynamic resolution (Mandala Shop pattern): full sharpness at rest, lighter
// pixel load while the camera moves. ?px=N pins a ratio for perf testing.
const pxOverride = parseFloat(new URLSearchParams(location.search).get('px'));
// Caps lowered in the r3 perf pass (2026-07-22): 1.75 at rest was ~4500px wide
// on James's screen — fill rate was the frame budget. 1.5 still reads sharp.
const RES_HIGH = Math.min(devicePixelRatio, 1.5);
const RES_LOW = Math.min(devicePixelRatio, 1.1);
let resCurrent = pxOverride > 0 ? pxOverride : RES_HIGH;
renderer.setPixelRatio(resCurrent);
function applyRes(target) {
  if (pxOverride > 0 || resCurrent === target) return;
  resCurrent = target;
  renderer.setPixelRatio(target);
  renderer.setSize(innerWidth, innerHeight);
}
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.22;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0d100f);
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.05, 60);

const damp = THREE.MathUtils.damp;
const clamp = THREE.MathUtils.clamp;

/* ================= room dimensions ================= */

const ROOM = { x0: -9, x1: 9, z0: -6, z1: 6, h: 4.1 };   // ~2x Mandala Shop's floor

/* ================= tuner (loaded early — lights read it) ================= */

const TUNE_DEFAULTS = {
  pmGlow: 0.42,   // postmaster self-light: 0 = room-lit only, 1 = fully unlit-bright
  pmSplay: 0,     // outward upper-arm degrees added after every clip. Was 12 as a
                  // crutch for the retargeted Mixamo walk (v1 arm angles clipped
                  // the round thighs); iClone motions are animated on HIS body so
                  // the default is 0 — the knob stays for future imported clips.
  pmStill: 0,     // 1 = museum mode: all clips stopped (bind A-pose), no roaming —
                  // for inspecting the model; 0 resumes the routine
  pmHeight: 1.9,  // his height in meters (James r15: "a good head taller"), live
  lipSync: 0.05,  // seconds of extra mouth lead over the audio — trim by ear
  lipPunch: 1.0,  // viseme intensity multiplier — articulation emphasis
  ambient: 0.95,  // hemisphere fill
  fluor: 1.7,     // fluorescent fixture intensity
  bulb: 1.8,      // hanging-bulb intensity multiplier
  lamp: 1.8,      // banker's lamp glow
  furnace: 1.1,   // furnace ember glow
  shaft: 0.16,    // window light-shaft opacity
  fog: 0.016,     // basement murk density
  mailEvery: 4.5, // seconds between falling letters
  fallSpeed: 0.7, // m/s base descent (0.4 until 2026-08-10, James's call)
  pace: 1.0,      // postmaster activity gap multiplier (higher = lazier)
  walk: 0.6,      // postmaster walk speed m/s. 0.95 dated from the r16 scale
                  // error (feet stepped 45% slow, so speed read low); the
                  // clip's honest pace is 0.425 — 0.6 is a working shift pace
};
let tune = { ...TUNE_DEFAULTS };
// v2 key (2026-07-22 brightness pass): stored v1 values were tuned against the
// dungeon-dark build and would override the new, much brighter defaults
try {
  const stored = JSON.parse(localStorage.getItem('dlo-room-tuner-v3') || '{}');
  // fallSpeed default moved 0.4 -> 0.7 (2026-08-10): a stored 0.4 is the old
  // default, not a choice — drop it so the new default shows (key stays v3)
  if (stored.fallSpeed === 0.4) delete stored.fallSpeed;
  if (stored.walk === 0.95) delete stored.walk;   // r16-era default, not a choice
  Object.assign(tune, stored);
} catch (e) { /* fresh */ }

scene.fog = new THREE.FogExp2(0x0c0e0d, tune.fog);

/* ================= lighting ================= */

const hemi = new THREE.HemisphereLight(0x9aa89e, 0x3a352c, 0.95);
scene.add(hemi);

// two hanging bulbs (warm accents): mid-room and the east side. The one that
// used to hang over the basket is gone — letters fell through it (James); the
// basket gets a flanking pair of fluorescents instead. Only the mid-room bulb
// carries a real light (r3 perf pass — every point light is a per-fragment tax
// on every Standard material; the east corner is covered by fluor + furnace).
const BULBS = [
  [0.6, 3.1, 0.6, true],
  [5.6, 3.05, 1.6, false],
];
const bulbLights = [];
const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffd9a0 });
const shadeMat = new THREE.MeshStandardMaterial({ color: 0x243026, roughness: 0.6, metalness: 0.4, side: THREE.DoubleSide });
const cordMat = new THREE.MeshStandardMaterial({ color: 0x14100c, roughness: 0.9 });

// Ghost-through (James, 2026-08-04): fixtures stay fully solid to look at —
// but the ONE the camera is flying through fades out just while the eye is
// inside its bubble, so passing never fills the screen with fixture guts.
// Per-fixture material clones make the fade individual.
const ceilingFixtures = [];   // { pos, mats, fade }
function ghostable(mats, x, y, z) {
  const clones = mats.map((m) => {
    const c = m.clone();
    c.transparent = true;
    return c;
  });
  ceilingFixtures.push({ pos: new THREE.Vector3(x, y, z), mats: clones, fade: 1 });
  return clones;
}

for (const [x, y, z, lit] of BULBS) {
  if (lit) {
    const pt = new THREE.PointLight(0xffc87a, 1.5, 13, 1.6);
    pt.position.set(x, y - 0.09, z);
    bulbLights.push(pt);
    scene.add(pt);
  }
  const [gCord, gShade, gBulb] = ghostable([cordMat, shadeMat, bulbMat], x, y, z);
  const cordLen = ROOM.h - y - 0.18;
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, cordLen + 0.36, 5), gCord);
  cord.position.set(x, y + 0.18 + cordLen / 2, z);
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.13, 18, 1, true), gShade);
  shade.position.set(x, y + 0.1, z);
  const glass = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), gBulb);
  glass.position.set(x, y, z);
  scene.add(cord, shade, glass);
}

// Fluorescent fixtures (2026-07-22, "more light" pass): hanging twin-tube shop
// lights. STEADY — never flicker these (the 2D world's flicker overlay was a
// hard James veto). Fixtures with `lit` carry a real PointLight; the rest are
// emissive-only so the light count stays sane.
const fluorLights = [];
const fluorTubeMat = new THREE.MeshBasicMaterial({ color: 0xe4f2e2 });
const fluorBodyMat = new THREE.MeshStandardMaterial({ color: 0x8a9088, roughness: 0.5, metalness: 0.6 });
function fluorFixture(x, y, z, ry, lit) {
  const g = new THREE.Group();
  const [gBody, gTube, gCord] = ghostable([fluorBodyMat, fluorTubeMat, cordMat], x, y, z);
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.07, 0.28), gBody);
  g.add(body);
  for (const off of [-0.07, 0.07]) {
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 1.15, 10), gTube);
    tube.rotation.z = Math.PI / 2;
    tube.position.set(0, -0.05, off);
    g.add(tube);
  }
  for (const rx of [-0.45, 0.45]) {
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, ROOM.h - y, 5), gCord);
    rod.position.set(rx, (ROOM.h - y) / 2, 0);
    g.add(rod);
  }
  g.position.set(x, y, z);
  g.rotation.y = ry;
  scene.add(g);
  if (lit) {
    const pt = new THREE.PointLight(0xdff0e0, 1.7, 10, 1.7);
    pt.position.set(x, y - 0.14, z);
    fluorLights.push(pt);
    scene.add(pt);
  }
}
fluorFixture(-5.6, 3.0, -1.5, Math.PI / 2, true);   // flanking the basket…
fluorFixture(-3.4, 3.0, -1.5, Math.PI / 2, true);   // …clear of the letter drop
fluorFixture(2.5, 3.05, -4.1, 0, true);             // over the desk area
fluorFixture(0.2, 3.1, 2.9, 0.25, true);            // center-south
fluorFixture(-7.3, 3.05, 3.4, Math.PI / 2, true);   // door + big table corner
fluorFixture(6.3, 3.05, -4.7, 0, false);            // pigeonholes (emissive only)
fluorFixture(8.1, 3.05, -2.2, Math.PI / 2, false);  // file cabinet bank (emissive only)

// banker's lamp pool of green at the desk (fixture built with the desk below)
const lampLight = new THREE.PointLight(0x9adb6e, 1.8, 5, 1.8);
lampLight.position.set(2.12, 1.1, -4.68);
scene.add(lampLight);

// warm pool for the placeable floor lamps (anchored in refreshDynStations;
// dark until a 'floor-lamp' item exists). Four real lights max (raised from
// two 2026-08-04 when James hit the cap) — watch the frame rate before more.
const floorLampLights = [0, 1, 2, 3].map(() => {
  const l = new THREE.PointLight(0xffd9a0, 0, 6, 1.8);
  scene.add(l);
  return l;
});

// furnace embers — flickers in the loop; flares when a letter goes in
const furnaceLight = new THREE.PointLight(0xff7a2e, 1.1, 7, 1.8);
furnaceLight.position.set(6.4, 0.8, 3.3);
scene.add(furnaceLight);
let furnaceFlare = 0;

// high window: cool spill from the world upstairs
const windowLight = new THREE.DirectionalLight(0x9db8cc, 0.5);
windowLight.position.set(-8.6, 3.1, -2.0);
windowLight.target.position.set(-3.5, 0, -0.5);
scene.add(windowLight, windowLight.target);

/* ================= texture kit ================= */

const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());

function canvasBase(sizePx, draw) {
  const c = document.createElement('canvas');
  c.width = c.height = sizePx;
  draw(c.getContext('2d'), sizePx);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = maxAniso;
  return t;
}

// Never-black rule: procedural base first, Meshy tile drawn over it on load.
// Clones (props reuse the wood at another repeat) share the canvas, so the
// onload marks every registered clone dirty too.
function tileTex(file, fallbackDraw) {
  const t = canvasBase(512, fallbackDraw);
  t.userData.clones = [];
  const img = new Image();
  img.onload = () => {
    const c = t.image;
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    t.needsUpdate = true;
    for (const cl of t.userData.clones) cl.needsUpdate = true;
  };
  img.src = file;
  return t;
}

function jitter(hex, amt) {
  const c = new THREE.Color(hex);
  const f = 1 + (Math.random() * 2 - 1) * amt;
  return `rgb(${Math.round(c.r * 255 * f)},${Math.round(c.g * 255 * f)},${Math.round(c.b * 255 * f)})`;
}

// painted cinderblock (2026-07-28, James: "low rent but not fully peeling") —
// Meshy seamless tile over a cinderblock-proportioned fallback (blocks are
// twice as long as tall, running bond)
const texWall = tileTex('assets/textures/wall.png', (g, px) => {
  g.fillStyle = '#4f5852'; g.fillRect(0, 0, px, px);
  const bw = px / 3, bh = px / 6;
  for (let r = 0; r < 6; r++) for (let i = -1; i < 4; i++) {
    const off = (r % 2) * bw / 2;
    g.fillStyle = jitter('#5e6860', 0.07);
    g.fillRect(i * bw + off + 3, r * bh + 3, bw - 6, bh - 6);
  }
});
// Polished concrete (2026-07-22): the paver tile read as dungeon brick (James:
// "the floor needs to be more like a post office"). Uniform sealed grey with
// organic stains; the old floor.png stays on disk unused.
const texFloor = tileTex('assets/textures/concrete.png', (g, px) => {
  g.fillStyle = '#5c5850'; g.fillRect(0, 0, px, px);
  for (let k = 0; k < 30; k++) {
    g.fillStyle = `rgba(70,64,54,${0.05 + Math.random() * 0.08})`;
    g.beginPath();
    g.ellipse(Math.random() * px, Math.random() * px,
      px * (0.05 + Math.random() * 0.2), px * (0.04 + Math.random() * 0.12),
      Math.random() * Math.PI, 0, Math.PI * 2);
    g.fill();
  }
});
// the furnace-corner hearth (r12.1, James): brick pavers under the furnace
const texBrick = tileTex('assets/textures/brick.png', (g, px) => {
  g.fillStyle = '#5c3a2c'; g.fillRect(0, 0, px, px);
  const bw = px / 4, bh = px / 8;
  for (let r = 0; r < 8; r++) for (let i = -1; i < 5; i++) {
    const off = (r % 2) * bw / 2;
    g.fillStyle = jitter('#6e4534', 0.12);
    g.fillRect(i * bw + off + 2, r * bh + 2, bw - 4, bh - 4);
  }
});
const texWood = tileTex('assets/textures/wood.png', (g, px) => {
  g.fillStyle = '#4a331d'; g.fillRect(0, 0, px, px);
  const plank = px / 6;
  for (let x = 0; x < px; x += plank) {
    g.fillStyle = jitter('#57371c', 0.12);
    g.fillRect(x + 1, 0, plank - 2, px);
  }
});
// aged rusty iron (2026-08-04, the oil tank — Meshy tile, 3cr): charcoal-brown
// steel fallback with orange rust blooms until the real tile loads
const texRust = tileTex('assets/textures/rust-tile.jpg', (g, px) => {
  g.fillStyle = '#3a322c'; g.fillRect(0, 0, px, px);
  for (let k = 0; k < 70; k++) {
    g.fillStyle = jitter(k % 3 ? '#8a5424' : '#5a2a1e', 0.2);
    g.beginPath();
    g.ellipse(Math.random() * px, Math.random() * px, 6 + Math.random() * 26,
      4 + Math.random() * 14, Math.random() * Math.PI, 0, Math.PI * 2);
    g.fill();
  }
});

// per-surface UV scaling: one shared texture, geometry carries the repeat
function uvScale(geo, sx, sy) {
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * sx, uv.getY(i) * sy);
  uv.needsUpdate = true;
  return geo;
}

const WALL_TILE = 2.2, FLOOR_TILE = 4.2, WOOD_TILE = 1.7;
const matWall = new THREE.MeshStandardMaterial({ map: texWall, roughness: 0.94 });
// low roughness = the sealed-concrete sheen picking up the fixtures
const matFloor = new THREE.MeshStandardMaterial({ map: texFloor, roughness: 0.55 });
const matWood = new THREE.MeshStandardMaterial({ map: texWood, roughness: 0.8 });
const matWoodDark = new THREE.MeshStandardMaterial({ map: texWood, roughness: 0.85, color: 0x8a7a66 });
const matIron = new THREE.MeshStandardMaterial({ color: 0x2b2b2d, roughness: 0.55, metalness: 0.7 });
const matPipe = new THREE.MeshStandardMaterial({ color: 0x3a3d3c, roughness: 0.5, metalness: 0.75 });
// paper goods are Lambert (r3 perf pass): dozens of small meshes — envelopes,
// posters, parcels — don't need a PBR specular lobe times nine lights each
const matPaper = new THREE.MeshLambertMaterial({ color: 0xd8cdae });

/* ================= room shell ================= */

{
  const W = ROOM.x1 - ROOM.x0, D = ROOM.z1 - ROOM.z0;
  const floor = new THREE.Mesh(uvScale(new THREE.PlaneGeometry(W, D), W / FLOOR_TILE, D / FLOOR_TILE), matFloor);
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  // brick hearth pad in the furnace corner (r12.1): the one patch of floor the
  // concrete never covered. Sits a hair proud of the slab like the rug does.
  const BRICK_TILE = 1.15;
  const hearth = new THREE.Mesh(
    uvScale(new THREE.PlaneGeometry(3.8, 4.2), 3.8 / BRICK_TILE, 4.2 / BRICK_TILE),
    new THREE.MeshStandardMaterial({ map: texBrick, roughness: 0.85 }));
  hearth.rotation.x = -Math.PI / 2;
  hearth.position.set(ROOM.x1 - 1.9, 0.004, ROOM.z1 - 2.1);
  scene.add(hearth);

  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, D),
    new THREE.MeshStandardMaterial({ color: 0x211f1c, roughness: 0.95 }));
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = ROOM.h;
  scene.add(ceil);

  const mkWall = (w, x, z, ry) => {
    const m = new THREE.Mesh(uvScale(new THREE.PlaneGeometry(w, ROOM.h), w / WALL_TILE, ROOM.h / WALL_TILE), matWall);
    m.position.set(x, ROOM.h / 2, z);
    m.rotation.y = ry;
    scene.add(m);
  };
  mkWall(W, 0, ROOM.z0, 0);            // north
  mkWall(W, 0, ROOM.z1, Math.PI);      // south
  mkWall(D, ROOM.x0, 0, Math.PI / 2);  // west
  mkWall(D, ROOM.x1, 0, -Math.PI / 2); // east

  // ceiling beams + pipe runs, merged into two meshes
  const beamGeos = [];
  for (let z = -4.5; z <= 4.5; z += 3) {
    const g = new THREE.BoxGeometry(W, 0.22, 0.24);
    g.translate(0, ROOM.h - 0.11, z);
    beamGeos.push(uvScale(g, W / WOOD_TILE, 0.3));
  }
  scene.add(new THREE.Mesh(mergeGeometries(beamGeos), matWoodDark));

  const pipeGeos = [];
  const pipe = (r, len, x, y, z, rx, rz) => {
    const g = new THREE.CylinderGeometry(r, r, len, 10);
    if (rx) g.rotateX(rx);
    if (rz) g.rotateZ(rz);
    g.translate(x, y, z);
    pipeGeos.push(g);
  };
  pipe(0.07, 12, -6.6, ROOM.h - 0.34, 0, Math.PI / 2, 0);          // north-south run, west
  pipe(0.05, 12, -6.25, ROOM.h - 0.5, 0, Math.PI / 2, 0);
  pipe(0.07, 18, 0, ROOM.h - 0.4, 4.6, 0, Math.PI / 2);            // east-west run, south
  pipe(0.055, 18, 0, ROOM.h - 0.62, 4.85, 0, Math.PI / 2);
  pipe(0.07, ROOM.h, -8.6, ROOM.h / 2, -4.6, 0, 0);                // corner downpipe
  pipe(0.045, ROOM.h, 8.55, ROOM.h / 2, -4.9, 0, 0);
  // the heating plant's arteries (2026-08-03, James: "there's a bunch of
  // radiators upstairs that are probably getting heat from down here") — a fat
  // insulated steam main with risers punching up through the ceiling, plus a
  // second bank of runs so the ceiling reads like a working basement
  pipe(0.15, 18, 0, ROOM.h - 0.28, -2.3, 0, Math.PI / 2);          // the steam main, east-west
  pipe(0.15, 12, 6.2, ROOM.h - 0.3, 0, Math.PI / 2, 0);            // main's north-south branch
  pipe(0.09, 18, 0, ROOM.h - 0.55, -2.62, 0, Math.PI / 2);         // return line under the main
  pipe(0.06, 12, -3.4, ROOM.h - 0.45, 0, Math.PI / 2, 0);          // mid-room north-south run
  // risers: where the heat leaves for the radiators upstairs
  pipe(0.085, 1.1, -4.9, ROOM.h - 0.55, -2.3, 0, 0);
  pipe(0.085, 1.1, 1.7, ROOM.h - 0.55, -2.3, 0, 0);
  pipe(0.085, 1.1, 6.2, ROOM.h - 0.55, 2.9, 0, 0);
  pipe(0.06, 1.0, -3.4, ROOM.h - 0.5, 3.8, 0, 0);
  // elbow collars where the risers meet the main (a little flange thickness)
  for (const [ex, ez] of [[-4.9, -2.3], [1.7, -2.3], [6.2, 2.9]]) {
    pipe(0.105, 0.16, ex, ROOM.h - 0.24, ez, 0, 0);
  }
  scene.add(new THREE.Mesh(mergeGeometries(pipeGeos), matPipe));
}

/* ================= canvas signage ================= */

function signTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = maxAniso;
  return t;
}

function addSign(tex, w, h, x, y, z, ry, { lit = false } = {}) {
  const mat = lit
    ? new THREE.MeshBasicMaterial({ map: tex })
    : new THREE.MeshLambertMaterial({ map: tex });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.position.set(x, y, z);
  m.rotation.y = ry;
  scene.add(m);
  return m;
}

// DEAD LETTER OFFICE — the house sign. Placeable wall art since 2026-08-03
// (James: control everything on the walls) — the drawing lives here, the
// placement lives in the layout via WALL_ART 'art-housesign'.
function drawHouseSign(g, w, h) {
  g.fillStyle = '#1c262b'; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#5a6a66'; g.lineWidth = 10; g.strokeRect(14, 14, w - 28, h - 28);
  g.fillStyle = '#c9b483';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '700 118px "Arial Narrow", Impact, sans-serif';
  g.fillText('DEAD', w / 2, 118);
  g.fillText('LETTER', w / 2, 238);
  g.fillText('OFFICE', w / 2, 358);
  g.font = '700 44px "Arial Narrow", Impact, sans-serif';
  g.fillStyle = '#8a9a90';
  g.fillText('WE  DELIVER  NOWHERE', w / 2, 452);
}

// POSTMASTER JOHN DOUGH — his name plate, placeable wall art (2026-08-03)
function drawPostmasterSign(g, w, h) {
  g.fillStyle = '#211d16'; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#9a8446'; g.lineWidth = 8; g.strokeRect(7, 7, w - 14, h - 14);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#b09a64';
  g.font = '700 56px "Courier New", monospace';
  g.fillText('POSTMASTER', w / 2, 54);
  g.fillStyle = '#d8bd85';
  g.font = '700 74px "Courier New", monospace';
  g.fillText('JOHN DOUGH', w / 2, 128);
}

// (the drawn stopped clock is GONE — 2026-08-04, James's call: replaced by
// the Meshy pendulum wall clock, placeable as 'art-wallclock')

// tally boards — mechanical drum counters (2026-07-28, James: "look mechanical").
// Each digit lives in its own riveted window on a rolling wheel: brushed housing,
// drum shading, a flap seam across the middle. DEAD LETTERS ticks up live from
// deep in the hundreds of thousands; CLAIMED reads 117, forever (was 17
// until 2026-08-10 — James: "a hundred and seventeen in forty years is
// still a tiny amount. Seventeen is just sad.").
let deadLettersTotal = 614739;
const tallyCtx = {};
function tallyTexture(key, label, value) {
  return signTexture(512, 200, (g, w, h) => {
    tallyCtx[key] = { g, w, h, label };
    drawTally(g, w, h, label, value);
  });
}
function drawTally(g, w, h, label, value) {
  // housing: dark stamped steel with a machined edge
  g.fillStyle = '#191a17'; g.fillRect(0, 0, w, h);
  const hg = g.createLinearGradient(0, 0, 0, h);
  hg.addColorStop(0, '#34362f');
  hg.addColorStop(0.5, '#23241f');
  hg.addColorStop(1, '#151612');
  g.fillStyle = hg; g.fillRect(4, 4, w - 8, h - 8);
  g.strokeStyle = '#4d4a3c'; g.lineWidth = 5; g.strokeRect(7, 7, w - 14, h - 14);
  // corner rivets
  g.fillStyle = '#6a6452';
  for (const [rx, ry] of [[18, 18], [w - 18, 18], [18, h - 18], [w - 18, h - 18]]) {
    g.beginPath(); g.arc(rx, ry, 5, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#3a362a';
    g.beginPath(); g.arc(rx + 1, ry + 1, 2, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#6a6452';
  }
  // engraved label plate
  g.font = '700 26px "Courier New", monospace';
  const plateW = g.measureText(label).width + 36;
  g.fillStyle = '#0f100d';
  g.fillRect(w / 2 - plateW / 2, 16, plateW, 40);
  g.strokeStyle = '#5a5442'; g.lineWidth = 2;
  g.strokeRect(w / 2 - plateW / 2 + 2, 18, plateW - 4, 36);
  g.fillStyle = '#b09a62';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(label, w / 2, 37);
  // the digit wheels
  const digits = String(value);
  const cellW = 58, cellH = 104, gapX = 6;
  const rowW = digits.length * cellW + (digits.length - 1) * gapX;
  let x = w / 2 - rowW / 2;
  const cy = 66;
  for (const d of digits) {
    // window frame
    g.fillStyle = '#0a0b09';
    g.fillRect(x - 3, cy - 3, cellW + 6, cellH + 6);
    // drum: vertical gradient like a curved wheel catching the light
    const dg = g.createLinearGradient(0, cy, 0, cy + cellH);
    dg.addColorStop(0, '#101210');
    dg.addColorStop(0.28, '#2e302a');
    dg.addColorStop(0.5, '#3a3c34');
    dg.addColorStop(0.72, '#2e302a');
    dg.addColorStop(1, '#101210');
    g.fillStyle = dg;
    g.fillRect(x, cy, cellW, cellH);
    // neighbor digits peeking at the drum edges (rolled-wheel depth)
    g.fillStyle = 'rgba(210,190,140,0.16)';
    g.font = '700 34px "Courier New", monospace';
    g.fillText(String((Number(d) + 9) % 10), x + cellW / 2, cy + 10);
    g.fillText(String((Number(d) + 1) % 10), x + cellW / 2, cy + cellH - 10);
    // the digit itself
    g.fillStyle = '#e8cd8a';
    g.font = '700 74px "Courier New", monospace';
    g.fillText(d, x + cellW / 2, cy + cellH / 2 + 2);
    // flap seam across the middle
    g.strokeStyle = 'rgba(0,0,0,0.75)'; g.lineWidth = 3;
    g.beginPath();
    g.moveTo(x, cy + cellH / 2); g.lineTo(x + cellW, cy + cellH / 2);
    g.stroke();
    g.strokeStyle = '#55503e'; g.lineWidth = 2;
    g.strokeRect(x + 0.5, cy + 0.5, cellW - 1, cellH - 1);
    x += cellW + gapX;
  }
}
const texTallyDead = tallyTexture('dead', 'DEAD LETTERS', String(deadLettersTotal).padStart(7, '0'));
const texTallyClaimed = tallyTexture('claimed', 'CLAIMED', '0000117');
// The drum counters are placeable wall art since 2026-08-04 ('art-tally-*').
// Their textures live HERE and keep counting; every placed copy shares them.
const LIVE_ART_TEX = { tallyDead: texTallyDead, tallyClaimed: texTallyClaimed };
function bumpDeadLetters() {
  deadLettersTotal += 1;
  const t = tallyCtx.dead;
  drawTally(t.g, t.w, t.h, t.label, String(deadLettersTotal).padStart(7, '0'));
  texTallyDead.needsUpdate = true;
}

// (The LOST? cat poster moved into the wall-art catalog, 2026-07-28 — all wall
// art is arrange-mode placeable now; see the posters section.)

/* ================= west wall: window, radiator, door, punch clock ============ */

// high barred windows with cool light shafts — three now (2026-07-22): it's the
// dead letter office, not a dungeon; the upstairs world leaks in cozily
const shaftTex = (() => {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 256;
  const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, 'rgba(157,184,204,0.9)');
  gr.addColorStop(1, 'rgba(157,184,204,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 256);
  // soft horizontal falloff so the crossed planes have no hard side edges
  const side = g.createLinearGradient(0, 0, 64, 0);
  side.addColorStop(0, 'rgba(0,0,0,1)');
  side.addColorStop(0.28, 'rgba(0,0,0,0)');
  side.addColorStop(0.72, 'rgba(0,0,0,0)');
  side.addColorStop(1, 'rgba(0,0,0,1)');
  g.globalCompositeOperation = 'destination-out';
  g.fillStyle = side; g.fillRect(0, 0, 64, 256);
  return new THREE.CanvasTexture(c);
})();
const shaftMatTemplate = () => new THREE.MeshBasicMaterial({
  map: shaftTex, transparent: true, opacity: tune.shaft,
  blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
});
// each shaft = two planes crossed on the beam axis; per-frame each plane fades
// by how face-on it is to the camera, so walking around one never shows the
// old floating-pane-of-glass edge (James, 2026-08-03)
const shaftPlanes = [];
const shaftToCam = new THREE.Vector3();
// a bit of sky outside the panes (2026-07-28, James): pale overcast blue with
// slow clouds, drawn once — the world upstairs, seen from below the sidewalk
const skyTex = (() => {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 160;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 160);
  grad.addColorStop(0, '#8fb4d4');
  grad.addColorStop(0.65, '#a8c2d2');
  grad.addColorStop(1, '#c2ccc8');
  g.fillStyle = grad; g.fillRect(0, 0, 256, 160);
  for (let k = 0; k < 9; k++) {                       // soft cloud lumps
    const cx = Math.random() * 256, cy = 20 + Math.random() * 90;
    const cr = 18 + Math.random() * 34;
    const cg = g.createRadialGradient(cx, cy, 2, cx, cy, cr);
    cg.addColorStop(0, 'rgba(236,240,238,0.5)');
    cg.addColorStop(1, 'rgba(236,240,238,0)');
    g.fillStyle = cg;
    g.beginPath(); g.ellipse(cx, cy, cr * 1.5, cr * 0.55, 0, 0, Math.PI * 2); g.fill();
  }
  // sidewalk-level grass along the sill — thin leaning blades, properly green
  // (James r12.1: the 2px grey spikes read as spikes)
  g.lineCap = 'round';
  for (let x = 0; x < 256; x += 2 + Math.random() * 3) {
    const bh = 5 + Math.random() * 13;
    const lean = (Math.random() - 0.5) * 7;
    const gr = 96 + Math.random() * 50;
    g.strokeStyle = `rgba(${Math.round(gr * 0.45)},${Math.round(gr)},${Math.round(gr * 0.38)},0.9)`;
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(x, 160);
    g.quadraticCurveTo(x + lean * 0.3, 160 - bh * 0.6, x + lean, 160 - bh);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
})();
// window group built facing +z, then rotated onto its wall
function mkWindow(x, z, ry) {
  const g = new THREE.Group();
  const frame = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.05, 0.1), matIron);
  g.add(frame);
  const panes = new THREE.Mesh(
    new THREE.PlaneGeometry(1.56, 0.92),
    new THREE.MeshBasicMaterial({ map: skyTex }));
  panes.position.z = 0.06;
  g.add(panes);
  const barGeos = [];
  for (let i = -2; i <= 2; i++) {
    const bar = new THREE.CylinderGeometry(0.018, 0.018, 0.98, 6);
    bar.translate(i * 0.3, 0, 0);
    barGeos.push(bar);
  }
  const hbar = new THREE.CylinderGeometry(0.016, 0.016, 1.6, 6);
  hbar.rotateZ(Math.PI / 2);
  barGeos.push(hbar);
  const bars = new THREE.Mesh(mergeGeometries(barGeos), matIron);
  bars.position.z = 0.1;
  g.add(bars);
  g.position.set(x, 3.0, z);
  g.rotation.y = ry;
  scene.add(g);
}
function mkShaft(x, y, z, zRoll) {
  const crossTurn = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
  for (let k = 0; k < 2; k++) {
    const mat = shaftMatTemplate();
    const shaft = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 4.6), mat);
    shaft.position.set(x, y, z);
    shaft.rotation.set(0, Math.PI / 2, zRoll);
    if (k === 1) shaft.quaternion.multiply(crossTurn);   // crossed on the beam axis
    scene.add(shaft);
    shaft.updateMatrixWorld(true);
    const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(shaft.quaternion);
    shaftPlanes.push({ mesh: shaft, mat, normal });
  }
}
mkWindow(ROOM.x0 + 0.06, -2.0, Math.PI / 2);   // west (the original)
mkShaft(ROOM.x0 + 1.65, 1.85, -1.6, 0.62);
mkWindow(-5.5, ROOM.z1 - 0.06, Math.PI);       // south pair
mkShaft(-5.2, 1.85, ROOM.z1 - 1.6, -0.62);
mkWindow(5.8, ROOM.z1 - 0.06, Math.PI);
mkShaft(5.5, 1.85, ROOM.z1 - 1.6, -0.62);

// (the radiator became the 'radiator' placeable, 2026-08-03 — buildRadiator
// in the furniture catalog. Its fins still speak a little Morse, wherever
// James parks it.)

// the stairwell door — a drift exit. Metal, wire glass, somewhere above: stairs.
const doorMeshes = new Set();
{
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.09, 2.25, 1.12),
    new THREE.MeshStandardMaterial({ color: 0x39443e, roughness: 0.6, metalness: 0.45 }));
  door.position.set(ROOM.x0 + 0.06, 1.125, 2.6);
  scene.add(door);
  doorMeshes.add(door);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.46),
    new THREE.MeshBasicMaterial({ color: 0x6a7d54 }));
  glass.position.set(ROOM.x0 + 0.115, 1.7, 2.6);
  glass.rotation.y = Math.PI / 2;
  scene.add(glass);
  doorMeshes.add(glass);
  // wire grid over the glass
  const wires = [];
  for (let i = -3; i <= 3; i++) {
    const gv = new THREE.CylinderGeometry(0.004, 0.004, 0.46, 4);
    gv.translate(0, 0, i * 0.048);
    wires.push(gv);
    const gh = new THREE.CylinderGeometry(0.004, 0.004, 0.34, 4);
    gh.rotateX(Math.PI / 2);
    gh.translate(0, i * 0.062, 0);
    wires.push(gh);
  }
  const wireMesh = new THREE.Mesh(mergeGeometries(wires), matIron);
  wireMesh.position.set(ROOM.x0 + 0.12, 1.7, 2.6);
  scene.add(wireMesh);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0x9a8a5a, roughness: 0.35, metalness: 0.9 }));
  knob.position.set(ROOM.x0 + 0.13, 1.05, 2.18);
  scene.add(knob);
  doorMeshes.add(knob);
  // (the drawn STAIRS â†— plate retired 2026-08-04 — James's Meshy EXIT sign
  // is placeable wall art now, 'art-exitsign')
}

// punch clock beside the door, amber and counting your shift
const punchCtx = {};
const texPunch = signTexture(256, 128, (g, w, h) => {
  punchCtx.g = g; punchCtx.w = w; punchCtx.h = h;
  drawPunch('0:00');
});
function drawPunch(text) {
  const { g, w, h } = punchCtx;
  g.fillStyle = '#141210'; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#4a4436'; g.lineWidth = 6; g.strokeRect(6, 6, w - 12, h - 12);
  g.fillStyle = '#d8a54a';
  g.font = '700 64px "Courier New", monospace';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, w / 2, h / 2 + 2);
}
const punchClockMeshes = new Set();
{
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.62, 0.42), matIron);
  body.position.set(ROOM.x0 + 0.1, 1.62, 1.15);
  scene.add(body);
  punchClockMeshes.add(body);
  const face = addSign(texPunch, 0.34, 0.17, ROOM.x0 + 0.185, 1.74, 1.15, Math.PI / 2, { lit: true });
  punchClockMeshes.add(face);
  // card rack with three timecards, one forever half-punched
  const rack = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.3, 0.34), matWoodDark);
  rack.position.set(ROOM.x0 + 0.06, 1.02, 1.15);
  scene.add(rack);
  for (let i = 0; i < 3; i++) {
    const card = new THREE.Mesh(new THREE.PlaneGeometry(0.075, 0.16), matPaper);
    card.position.set(ROOM.x0 + 0.1, 1.14, 1.02 + i * 0.13);
    card.rotation.set(0, Math.PI / 2, (i - 1) * 0.06);
    scene.add(card);
  }
}

/* ================= north wall: pigeonholes ================= */

// The unit itself is the 'pigeonholes' placeable since 2026-08-03
// (buildPigeonholes in the furniture catalog). This array holds the WORLD
// slot positions envelopes fly into — refreshDynStations rebuilds it from
// the first placed unit; empty means nowhere to file (he burns instead).
const pigeonholeSlots = [];

/* ================= east wall: the file cabinet bank, coat rack ============== */

// A double-deep bank of green filing cabinets (2026-07-22, James): five wide
// along the wall, two rows deep. The lone cabinet + coffee hotplate it replaces
// moved on: coffee service lives on the donut table by the desk now.
// (the fixed cabinet bank became the 'cabinet-bank' placeable, 2026-08-03 —
// buildCabinetBank in the furniture catalog; the radio is a placeable too and
// rides wherever the bank goes)

// (the coat rack — pole, pegs, and the mail bag that never goes out — became
// the 'coat-rack' placeable, 2026-08-03; buildCoatRack in the catalog)

/* ================= the bookshelf (boring manuals + romance novels) =========== */

// one canvas per shelf row: spines with jittered widths/colors, vertical titles
// on the fat ones — 1 draw call per row instead of 30 book meshes
function bookRowTex(kind) {
  return signTexture(512, 128, (g, w, h) => {
    g.fillStyle = '#241a10'; g.fillRect(0, 0, w, h);   // shadow behind the books
    const manuals = ['#4a5460', '#55604a', '#5a5248', '#606055', '#4e4a58'];
    const romance = ['#9a4a5c', '#b06a6a', '#8a4a7a', '#c98a8a', '#a85a48'];
    const titles = kind === 'manuals'
      ? ['POSTAL REG. VOL 7', 'ROUTES', 'ZIP SUPPL. 1974', 'FORMS 11-C', 'BAG MAINT.', 'CODES']
      : ['THE LONELY COURIER', 'POSTMARKED, LOVE', 'FIRST CLASS HEARTS', 'RETURN TO SENDER', 'AIR MAIL AFFAIR'];
    const colors = kind === 'manuals' ? manuals : romance;
    let x = 4, t = 0;
    // one leaning gap per row: a book at rest against its neighbors
    const gapAt = w * (0.55 + Math.random() * 0.25);
    while (x < w - 20) {
      if (x > gapAt && x < gapAt + 40) {   // the leaner
        const bw = 22, bh = h * 0.72;
        g.save();
        g.translate(x + bw / 2, h);
        g.rotate(-0.32);
        g.fillStyle = jitter(colors[t % colors.length], 0.12);
        g.fillRect(-bw / 2, -bh, bw, bh);
        g.restore();
        x += 52; t++;
        continue;
      }
      const bw = 16 + Math.random() * 22;
      const bh = h * (0.68 + Math.random() * 0.24);
      const c = jitter(colors[Math.floor(Math.random() * colors.length)], 0.1);
      g.fillStyle = c;
      g.fillRect(x, h - bh, bw, bh);
      g.fillStyle = 'rgba(0,0,0,0.25)';
      g.fillRect(x, h - bh, 2, bh);                    // spine edge shade
      g.fillStyle = 'rgba(230,220,190,0.7)';
      g.fillRect(x + 3, h - bh + 6, bw - 6, 3);        // top band
      if (bw > 26 && t < titles.length) {              // vertical title
        g.save();
        g.translate(x + bw / 2 + 4, h - 10);
        g.rotate(-Math.PI / 2);
        g.fillStyle = 'rgba(240,232,205,0.85)';
        g.font = '700 13px "Courier New", monospace';
        g.textAlign = 'left';
        g.fillText(titles[t], 6, 4);
        g.restore();
        t++;
      }
      x += bw + 2 + Math.random() * 6;
    }
  });
}
// (the fixed bookshelf became the 'bookshelf' arrange-mode placeable,
// 2026-08-03 — buildBookshelf in the furniture catalog section)

/* ================= the archive stacks (2026-07-27, James's brief) ============ */

// "Like a police archive room" — steel shelving units filled with dated bankers
// boxes: everything the office ever swallowed, filed and labeled. Every box face
// samples ONE canvas atlas (a single material for the whole archive) and each
// unit's boxes merge into one geometry, so five units + floor stacks cost about
// a dozen draw calls total.

const ARCHIVE_LABELS = [
  { t: 'DIVORCE PAPERS' }, { t: 'LETTERS TO SANTA' },
  { t: 'PATENT APPLICATIONS', s: 'REJECTED' }, { t: 'DICK PICS', s: 'CONFISCATED' },
  { t: 'CHAIN LETTERS', s: 'DO NOT OPEN' }, { t: 'RANSOM NOTES' },
  { t: 'LOVE LETTERS', sub: 'UNSENT' }, { t: 'SWEEPSTAKES WINNERS', sub: 'UNREACHED' },
  { t: 'JURY SUMMONS', sub: 'IGNORED' }, { t: 'TAX RETURNS' },
  { t: 'COMPLAINTS' }, { t: 'WRONG ADDRESSES' },
  { t: 'POSTAGE DUE' }, { t: 'FINAL NOTICES' },
  { t: 'WEDDING INVITATIONS', s: 'RETURNED' }, { t: 'PEN PALS', sub: 'LAPSED' },
  { t: 'BIRTHDAY CARDS', sub: 'LATE' }, { t: 'APOLOGIES' },
  { t: 'THREATS', sub: 'VAGUE' }, { t: 'CHAIN RECIPES' },
  { t: 'SÃ‰ANCE REQUESTS' }, { t: 'MANIFESTOS' },
  { t: 'HOMEWORK EXCUSES' }, { t: 'POSTCARDS' },
  { t: 'PRAYERS', sub: 'MISADDRESSED' }, { t: 'UFO REPORTS', s: 'UNVERIFIED' },
  { t: 'BILLS', sub: 'DISPUTED' }, { t: 'FAN MAIL', sub: 'NO SUCH STAR' },
  { t: 'TO WHOM IT MAY', sub: 'CONCERN' }, { t: 'GLITTER', s: 'HAZARD' },
  { t: 'MESSAGES IN BOTTLES' }, { t: 'RESIGNATION LETTERS' },
  // 2026-07-28 expansion: the pool was 32; the atlas holds 72 with room for the
  // plain/top tiles, so the archive repeats itself far less often now
  { t: 'ALIBIS', sub: 'NOTARIZED' }, { t: 'CONFESSIONS', s: 'UNREAD' },
  { t: 'REBATE FORMS' }, { t: 'PYRAMID SCHEMES', sub: 'FLOOR 2' },
  { t: 'BABY PHOTOS', sub: 'STRANGERS' }, { t: 'EVICTION NOTICES' },
  { t: 'HATE MAIL', sub: 'POLITE' }, { t: 'GET WELL SOONS', sub: 'TOO LATE' },
  { t: 'THANK YOU NOTES', sub: 'INSINCERE' }, { t: 'SUBPOENAS', s: 'DUCKED' },
  { t: 'HOROSCOPES', sub: 'WRONG' }, { t: 'CATALOG ORDERS', sub: 'DISCONTINUED' },
  { t: 'LOTTERY TICKETS', sub: 'UNSCRATCHED' }, { t: 'COUPONS', s: 'EXPIRED' },
  { t: 'SECRET ADMIRERS' }, { t: 'BLACKMAIL', sub: 'AMATEUR' },
  { t: 'CEASE AND DESIST' }, { t: 'DESIST AND CEASE' },
  { t: 'RSVPS', sub: 'REGRETS ONLY' }, { t: 'PERMISSION SLIPS', sub: 'UNSIGNED' },
  { t: 'REFERENCES', sub: 'DO NOT CALL' }, { t: 'CENSUS FORMS', sub: 'FICTIONAL' },
  { t: 'DIPLOMAS', s: 'SUSPECT' }, { t: 'WARRANTIES', sub: 'VOIDED' },
  { t: 'TIME CAPSULE MAIL', sub: 'EARLY' }, { t: 'GHOST WRITING', sub: 'LITERAL' },
  { t: 'SMELLS', s: 'CONTAINED' }, { t: 'CROSSWORD ANSWERS', sub: 'GLOATING' },
  { t: 'PIGEON RECEIPTS' }, { t: 'MOTHS', s: 'DO NOT FEED' },
  { t: 'FRUITCAKE', sub: 'CIRCULATING' }, { t: 'BAD NEWS', sub: 'ASSORTED' },
  { t: 'GOOD NEWS', sub: 'SEE BAD NEWS' }, { t: 'ULTIMATUMS', sub: 'SOFTENED' },
  { t: 'MAPS TO NOWHERE' }, { t: 'KEYS', sub: 'NO LOCKS' },
  { t: 'LOCKS', sub: 'NO KEYS' }, { t: 'IOUS', sub: 'INTEREST WAIVED' },
  { t: 'DREAMS', sub: 'FORM 8-D' }, { t: 'STATIC', s: 'SEALED' },
];

const AT_COLS = 8, AT_TW = 256, AT_TH = 192, AT_PX = 2048;
const N_PLAIN = 4, N_TOP = 4;
const PLAIN0 = ARCHIVE_LABELS.length, TOP0 = PLAIN0 + N_PLAIN;

function cardboardPatch(g, x, y, w, h, tone) {
  g.fillStyle = tone;
  g.fillRect(x, y, w, h);
  for (let i = 0; i < 14; i++) {                     // corrugation streaks
    g.fillStyle = `rgba(60,40,20,${0.03 + Math.random() * 0.05})`;
    g.fillRect(x + Math.random() * (w - 10), y, 2 + Math.random() * 8, h);
  }
  g.strokeStyle = 'rgba(50,32,16,0.5)';
  g.lineWidth = 3;
  g.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
  g.fillStyle = 'rgba(40,26,12,0.25)';               // bottom-edge wear
  g.fillRect(x, y + h - 5, w, 5);
}

const boxAtlasTex = (() => {
  const c = document.createElement('canvas');
  c.width = c.height = AT_PX;
  const g = c.getContext('2d');
  g.fillStyle = '#8a6b48';
  g.fillRect(0, 0, AT_PX, AT_PX);
  const tileXY = (i) => [(i % AT_COLS) * AT_TW, Math.floor(i / AT_COLS) * AT_TH];
  ARCHIVE_LABELS.forEach((L, i) => {
    const [x, y] = tileXY(i);
    cardboardPatch(g, x, y, AT_TW, AT_TH, jitter('#9a7a52', 0.09));
    // the label card: manila, typed, slightly crooked — filed in a hurry, kept forever
    const lw = 190, lh = 96, lx = x + (AT_TW - lw) / 2, ly = y + 26 + Math.random() * 14;
    g.save();
    g.translate(lx + lw / 2, ly + lh / 2);
    g.rotate((Math.random() - 0.5) * 0.05);
    g.fillStyle = '#ddd2ac';
    g.fillRect(-lw / 2, -lh / 2, lw, lh);
    g.strokeStyle = '#6a5a3c';
    g.lineWidth = 2;
    g.strokeRect(-lw / 2 + 3, -lh / 2 + 3, lw - 6, lh - 6);
    g.fillStyle = '#2a241c';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    let fs = 20;
    g.font = `700 ${fs}px "Courier New", monospace`;
    while (g.measureText(L.t).width > lw - 18 && fs > 11) {
      fs -= 1;
      g.font = `700 ${fs}px "Courier New", monospace`;
    }
    const y0 = 1947 + Math.floor(Math.random() * 38);
    const dates = `${y0}–${Math.min(1991, y0 + 1 + Math.floor(Math.random() * 9))}`;
    if (L.sub) {
      g.fillText(L.t, 0, -24);
      g.font = '700 15px "Courier New", monospace';
      g.fillText(`(${L.sub})`, 0, -4);
      g.font = '400 15px "Courier New", monospace';
      g.fillText(dates, 0, 18);
    } else {
      g.fillText(L.t, 0, -16);
      g.font = '400 16px "Courier New", monospace';
      g.fillText(dates, 0, 10);
    }
    g.restore();
    if (L.s) {                                       // the red rubber stamp
      g.save();
      g.translate(x + AT_TW / 2, y + AT_TH - 30);
      g.rotate(-0.12 - Math.random() * 0.1);
      g.font = '700 24px "Courier New", monospace';
      g.fillStyle = 'rgba(160,40,32,0.78)';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(L.s, 0, 0);
      const sw = g.measureText(L.s).width;
      g.strokeStyle = 'rgba(160,40,32,0.6)';
      g.lineWidth = 2;
      g.strokeRect(-sw / 2 - 8, -16, sw + 16, 32);
      g.restore();
    }
  });
  for (let i = 0; i < N_PLAIN; i++) {
    const [x, y] = tileXY(PLAIN0 + i);
    cardboardPatch(g, x, y, AT_TW, AT_TH, jitter('#96774f', 0.1));
  }
  for (let i = 0; i < N_TOP; i++) {
    const [x, y] = tileXY(TOP0 + i);
    cardboardPatch(g, x, y, AT_TW, AT_TH, jitter('#8f7049', 0.1));
    g.fillStyle = 'rgba(200,180,140,0.35)';          // packing tape over the lid seam
    g.fillRect(x + AT_TW / 2 - 14, y, 28, AT_TH);
    g.fillStyle = 'rgba(50,34,18,0.4)';
    g.fillRect(x + AT_TW / 2 - 2, y, 4, AT_TH);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = maxAniso;
  return t;
})();
// (matBoxAtlas retired with the cabinet-top strays, 2026-08-03 — furniture
// items each get their own boxAtlasTex Lambert via furnitureMaterial)
const matShelfSteel = new THREE.MeshStandardMaterial({ color: 0x4a4f46, roughness: 0.5, metalness: 0.6 });

// remap one BoxGeometry face's unit UVs into an atlas tile
// (face order: +x, -x, +y, -y, +z, -z; 4 uv verts per face)
function setFaceTile(geo, face, tile) {
  const uv = geo.attributes.uv;
  const u0 = (tile % AT_COLS) * (AT_TW / AT_PX);
  const v1 = 1 - Math.floor(tile / AT_COLS) * (AT_TH / AT_PX);
  for (let i = face * 4; i < face * 4 + 4; i++) {
    uv.setXY(i, u0 + uv.getX(i) * (AT_TW / AT_PX), v1 - (1 - uv.getY(i)) * (AT_TH / AT_PX));
  }
}

// Deterministic per-item randomness: every layout item carries a seed, so a
// rebuild (or a reload) keeps the exact same boxes with the exact same labels.
function mulberry32(a) {
  return () => {
    a |= 0; a = a + 0x6d2b79f5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

const BOX_W = 0.42, BOX_H = 0.30, BOX_D = 0.36;
function archiveBoxGeo(rnd) {
  const plain = () => PLAIN0 + Math.floor(rnd() * N_PLAIN);
  const g = new THREE.BoxGeometry(
    BOX_W * (0.94 + rnd() * 0.12), BOX_H * (0.92 + rnd() * 0.12), BOX_D);
  setFaceTile(g, 0, plain());
  setFaceTile(g, 1, plain());
  setFaceTile(g, 2, TOP0 + Math.floor(rnd() * N_TOP));
  setFaceTile(g, 3, plain());
  setFaceTile(g, 4, Math.floor(rnd() * ARCHIVE_LABELS.length));   // label faces +z
  setFaceTile(g, 5, plain());
  return g;
}

// The droppable furniture catalog (arrange mode palette). fw/fd are the
// footprint used for camera keep-outs and the nav-edge warning — plain
// literals so the Node sim can eval this block straight from source.
const FURNITURE = {
  // the PM's archive shelving (renamed 2026-08-04, James: "I can't tell
  // what's what" — these are the letter-box stacks he gathers and catalogs)
  'shelf-double': { label: 'PM shelf: 2-sided row', len: 3.0, dep: 0.85, h: 2.06, levels: 4, fill: 0.92, double: true, fw: 3.14, fd: 0.99 },
  'shelf-single': { label: 'PM shelf: wall', len: 1.7, dep: 0.42, h: 2.06, levels: 4, fill: 0.92, double: false, fw: 1.84, fd: 0.56 },
  'shelf-tall': { label: 'PM shelf: tall', len: 2.2, dep: 0.42, h: 2.62, levels: 5, fill: 0.92, double: false, fw: 2.34, fd: 0.56 },
  'shelf-sparse': { label: 'PM shelf: half-empty', len: 2.2, dep: 0.42, h: 2.06, levels: 4, fill: 0.45, double: false, fw: 2.34, fd: 0.56 },
  'stack-3': { label: 'stack of 3 boxes', n: 3, fw: 0.62, fd: 0.56 },
  'stack-2': { label: 'stack of 2 boxes', n: 2, fw: 0.62, fd: 0.56 },
  'box': { label: 'lone box', n: 1, fw: 0.56, fd: 0.5 },
  'crate': { label: 'wooden crate', fw: 1.0, fd: 0.8 },
  // the great furnishing expansion (2026-08-03, James: "arrange everything in
  // a perfectly human way like a man would do it at work down there").
  // glb entries clone a Meshy prop; table entries are [w, d, h] wood tables;
  // surf entries are tabletop clutter — no camera keep-out, they carry a y
  // (surface height) and raycast onto whatever they're dropped on.
  'chair': { label: 'office chair', glb: 'chair.glb', gh: 0.96, fw: 0.6, fd: 0.6 },
  'couch': { label: 'the couch', glb: 'couch.glb', gh: 0.8, fw: 2.2, fd: 1.0 },
  'plant-big': { label: 'plant (floor)', glb: 'plant.glb', gh: 0.72, tint: 0xc9a070, fw: 0.5, fd: 0.5 },
  'plant-small': { label: 'plant (small)', glb: 'plant.glb', gh: 0.3, tint: 0xd0b088, surf: true, fw: 0.3, fd: 0.3 },
  'coffee-table': { label: 'coffee table', table: [1.1, 0.5, 0.42], fw: 1.25, fd: 0.65 },
  'work-table': { label: 'work table', table: [1.15, 0.62, 0.78], fw: 1.3, fd: 0.75 },
  'big-table': { label: 'big table', table: [1.55, 0.85, 0.78], fw: 1.7, fd: 1.0 },
  'bookshelf': { label: 'bookshelf', book: 1, fw: 1.55, fd: 0.5 },
  'desk': { label: 'the desk', glb: 'desk.glb', gh: 1.42, fw: 2.0, fd: 1.0 },
  'cabinet-bank': { label: 'file cabinets', cab: 1, fw: 3.7, fd: 1.5 },
  'radio': { label: 'the radio', glb: 'radio.glb', gh: 0.3, surf: true, keepMats: true, radio: true, fw: 0.4, fd: 0.3 },
  'svc-lamp': { label: "banker's lamp", surf: true, fw: 0.3, fd: 0.3 },
  'svc-mug': { label: 'coffee mug', glb: 'mug.glb', gh: 0.105, surf: true, fw: 0.15, fd: 0.15 },
  'svc-papers': { label: 'paper reams', surf: true, fw: 0.3, fd: 0.4 },
  'svc-rts': { label: 'return-to-sender sign', surf: true, fw: 0.32, fd: 0.1 },
  'parcel': { label: 'wrapped parcel', surf: true, fw: 0.5, fd: 0.45 },
  'svc-coffee': { label: 'coffee service', surf: true, fw: 0.45, fd: 0.35 },
  'svc-donuts': { label: 'box of donuts', surf: true, fw: 0.5, fd: 0.4 },
  'svc-lunchbox': { label: 'lunchbox', surf: true, fw: 0.35, fd: 0.25 },
  'svc-scale': { label: 'parcel scale', surf: true, fw: 0.4, fd: 0.4 },
  'svc-twine': { label: 'ball of twine', surf: true, fw: 0.2, fd: 0.2 },
  'svc-ledger': { label: 'ledger + ink', surf: true, fw: 0.5, fd: 0.5 },
  // flat floor pieces: no keep-out (you walk over a rug), wheel still rotates
  'rug': { label: 'the rug', rug: 1, surf: true, fw: 4.4, fd: 3.2 },
  'rug-2': { label: 'rug two (oriental)', rug: 2, surf: true, fw: 4.4, fd: 3.06 },
  'welcome-mat': { label: 'welcome mat', wmat: 1, surf: true, fw: 0.95, fd: 0.55 },
  'coat-rack': { label: 'coat rack', rack: 1, fw: 0.55, fd: 0.55 },
  'radiator': { label: 'radiator', radi: 1, fw: 1.15, fd: 0.3 },
  'oil-tank': { label: 'oil tank', glb: 'oiltank.glb', gh: 2.05, fw: 3.5, fd: 1.15 },
  // James's Meshy batch (2026-08-04): keepMats = they wear their own textures
  'bookshelf-2': { label: 'book rack (steel)', glb: 'bookshelf2.glb', gh: 1.55, keepMats: true, fw: 1.85, fd: 1.0 },
  'coffee-maker': { label: 'coffee maker', glb: 'coffeemaker.glb', gh: 0.32, keepMats: true, surf: true, fw: 0.25, fd: 0.25 },
  'mug-green': { label: 'mug (green)', glb: 'greenmug.glb', gh: 0.1, keepMats: true, surf: true, fw: 0.12, fd: 0.12 },
  'lunchbox-2': { label: 'lunchbox (vault-tec)', glb: 'lunchbox2.glb', gh: 0.17, keepMats: true, surf: true, fw: 0.2, fd: 0.12 },
  'open-book': { label: 'open book', glb: 'openbook.glb', gh: 0.09, keepMats: true, surf: true, fw: 0.42, fd: 0.32 },
  'wastebasket': { label: 'wastebasket', glb: 'wastebasket.glb', gh: 0.41, keepMats: true, surf: true, wear: { alpha: 0.15, repeat: 2 }, fw: 0.3, fd: 0.3 },
  'floor-lamp': { label: 'floor lamp', glb: 'floorlamp.glb', gh: 1.7, keepMats: true, fw: 0.45, fd: 0.45 },
  // the letter rack he files into — its slots ride the item (refreshDynStations)
  'pigeonholes': { label: 'pigeonholes', pig: 1, fw: 3.25, fd: 0.65 },
};

function buildShelf(def, rnd) {
  const { len, dep: D, h: H } = def;
  const LEVELS = [];
  for (let l = 0; l < def.levels; l++) LEVELS.push(0.12 + l * (H - 0.46) / (def.levels - 1));
  const frame = [], boxes = [];
  const nBays = Math.max(1, Math.round(len / 1.0));
  for (let p = 0; p <= nBays; p++) {                 // posts
    const px = -len / 2 + (len / nBays) * p;
    for (const pz of [-D / 2 + 0.02, D / 2 - 0.02]) {
      const g = new THREE.BoxGeometry(0.045, H, 0.045);
      g.translate(px, H / 2, pz);
      frame.push(g);
    }
  }
  for (const ly of [...LEVELS, H - 0.06]) {          // shelf slabs + top rail
    const g = new THREE.BoxGeometry(len + 0.04, 0.028, D);
    g.translate(0, ly, 0);
    frame.push(g);
  }
  for (const ex of [-len / 2, len / 2]) {            // X cross-braces on the ends
    for (const s of [1, -1]) {
      const g = new THREE.BoxGeometry(0.025, Math.hypot(H - 0.2, D), 0.02);
      g.rotateX(s * Math.atan2(D, H - 0.2));
      g.translate(ex, H / 2, 0);
      frame.push(g);
    }
  }
  const sides = def.double ? [1, -1] : [1];
  for (const ly of LEVELS) {
    for (const s of sides) {
      let bx = -len / 2 + 0.26;
      while (bx < len / 2 - 0.2) {
        if (rnd() > def.fill) {                      // a gap: someone took one
          bx += 0.3 + rnd() * 0.2;
          continue;
        }
        const g = archiveBoxGeo(rnd);
        const proud = rnd() < 0.12 ? 0.05 : 0;       // pulled out, never pushed back
        const m = new THREE.Matrix4()
          .makeRotationY((rnd() - 0.5) * 0.09 + (s === 1 ? 0 : Math.PI));
        m.setPosition(bx, ly + 0.014 + BOX_H / 2,
          s * (D / 2 - BOX_D / 2 - 0.02) + s * proud);
        g.applyMatrix4(m);
        boxes.push(g);
        bx += BOX_W + 0.035 + rnd() * 0.05;
      }
    }
  }
  return [
    { geo: mergeGeometries(frame), mat: 'steel' },
    { geo: mergeGeometries(boxes), mat: 'boxes' },
  ];
}

function buildStack(def, rnd) {
  const geos = [];
  for (let i = 0; i < def.n; i++) {
    const g = archiveBoxGeo(rnd);
    const m = new THREE.Matrix4().makeRotationY((rnd() - 0.5) * 0.35);
    m.setPosition((rnd() - 0.5) * 0.05,
      0.005 + BOX_H / 2 + i * (BOX_H + 0.008),
      (rnd() - 0.5) * 0.05);
    g.applyMatrix4(m);
    geos.push(g);
  }
  return [{ geo: mergeGeometries(geos), mat: 'boxes' }];
}

function buildCrate(def, rnd) {
  const w = 0.85 + rnd() * 0.1, h = 0.55 + rnd() * 0.12, d = 0.62 + rnd() * 0.1;
  const g = uvScale(new THREE.BoxGeometry(w, h, d), w / WOOD_TILE, h / WOOD_TILE);
  g.translate(0, h / 2, 0);
  return [{ geo: g, mat: 'wood' }];
}

/* ---- the furnishing builders (2026-08-03): tables, bookshelf, GLB props,
   tabletop clutter. Every part material is per-item so shade stays live. ---- */

// per-part material with its own shade base (applyShade owns .color after this)
function ownMat(color, opts = {}, lambert = false) {
  const m = lambert
    ? new THREE.MeshLambertMaterial(opts)
    : new THREE.MeshStandardMaterial(opts);
  m.color.setHex(color);
  m.userData.shadeBase = new THREE.Color(color);
  return m;
}

// shared parcel look: brown paper + twine cross (moved up 2026-08-03 — the
// 'parcel' placeable builds at layout time, before the old definition site)
const texParcel = canvasBase(128, (g, px) => {
  g.fillStyle = '#a58a62'; g.fillRect(0, 0, px, px);
  g.fillStyle = 'rgba(122,98,64,0.5)';
  g.fillRect(px * 0.44, 0, px * 0.12, px);
  g.fillRect(0, px * 0.44, px, px * 0.12);
});
const matParcel = new THREE.MeshLambertMaterial({ map: texParcel });

function buildTable(def) {
  const [w, d, h] = def.table;
  const geos = [];
  const top = uvScale(new THREE.BoxGeometry(w, 0.06, d), w / WOOD_TILE, d / WOOD_TILE);
  top.translate(0, h - 0.03, 0);
  geos.push(top);
  for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const leg = new THREE.BoxGeometry(0.06, h - 0.06, 0.06);
    leg.translate(lx * (w / 2 - 0.07), (h - 0.06) / 2, lz * (d / 2 - 0.07));
    geos.push(leg);
  }
  return [{ geo: mergeGeometries(geos), mat: 'wood' }];
}

// the bookshelf, reborn as a placeable: front faces +z at rotY 0
function buildBookshelf() {
  const W = 1.4, H = 1.88, D = 0.32;
  const woodGeos = [];
  for (const sx of [-1, 1]) {
    const g = uvScale(new THREE.BoxGeometry(0.05, H, D), 0.3, 1.6);
    g.translate(sx * (W / 2), H / 2, 0);
    woodGeos.push(g);
  }
  const back = uvScale(new THREE.BoxGeometry(W, H, 0.04), 1.2, 1.6);
  back.translate(0, H / 2, -D / 2 + 0.02);
  woodGeos.push(back);
  const parts = [];
  const rowKinds = ['manuals', 'manuals', 'romance', 'romance'];
  for (let s = 0; s < 5; s++) {                       // 5 boards: bottom to top
    const y = 0.06 + s * (H - 0.12) / 4;
    const board = uvScale(new THREE.BoxGeometry(W, 0.045, D), 1.4, 0.3);
    board.translate(0, y, 0);
    woodGeos.push(board);
    if (s < 4) {                                      // books above this board
      const row = new THREE.PlaneGeometry(W - 0.1, 0.36);
      row.translate(0, y + 0.21, D / 2 - 0.09);
      const m = new THREE.MeshLambertMaterial({ map: bookRowTex(rowKinds[s]) });
      m.userData.shadeBase = new THREE.Color(0xffffff);
      parts.push({ geo: row, mat: m });
    }
  }
  parts.unshift({ geo: mergeGeometries(woodGeos), mat: 'wood' });
  return parts;
}

// the file cabinet bank as one placeable: 5 wide, 2 deep, drawer fronts +z,
// one drawer left open with papers — nobody closes anything down here
function buildCabinetBank(def, rnd) {
  const bodyGeos = [], drawerGeos = [], handleGeos = [];
  for (let row = 0; row < 2; row++) {
    const z = row === 0 ? 0.34 : -0.34;
    for (let i = 0; i < 5; i++) {
      const lx = (i - 2) * 0.72;
      const body = new THREE.BoxGeometry(0.66, 1.32, 0.62);
      body.translate(lx, 0.66, z);
      bodyGeos.push(body);
      if (row === 0) {   // only the front row shows drawer fronts
        for (let d = 0; d < 4; d++) {
          const dr = new THREE.BoxGeometry(0.56, 0.26, 0.03);
          dr.translate(lx, 0.24 + d * 0.31, 0.66);
          drawerGeos.push(dr);
          const h = new THREE.BoxGeometry(0.16, 0.035, 0.03);
          h.translate(lx, 0.3 + d * 0.31, 0.69);
          handleGeos.push(h);
        }
      }
    }
  }
  const openAt = (Math.floor(rnd() * 5) - 2) * 0.72;
  const open = new THREE.BoxGeometry(0.54, 0.24, 0.4);
  open.translate(openAt, 1.13, 0.8);
  bodyGeos.push(open);
  const openPapers = new THREE.BoxGeometry(0.44, 0.05, 0.3);
  openPapers.rotateZ(0.08);
  openPapers.translate(openAt - 0.02, 1.27, 0.82);
  return [
    { geo: mergeGeometries(bodyGeos), mat: ownMat(0x4e5a54, { roughness: 0.55, metalness: 0.5 }) },
    { geo: mergeGeometries(drawerGeos), mat: ownMat(0x2b2b2d, { roughness: 0.55, metalness: 0.7 }) },
    { geo: mergeGeometries(handleGeos), mat: ownMat(0x9a8a5a, { metalness: 0.8, roughness: 0.4 }) },
    { geo: openPapers, mat: ownMat(0xd8cdae, {}, true) },
  ];
}

// the rug: threadbare wool drawn per-item (each one wears differently), flat
// on whatever it lands on, no keep-out — feet and casters go right over it
function buildRug(def, rnd) {
  const texRug = signTexture(512, 340, (g, w, h) => {
    g.fillStyle = '#5e2f28'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#8a5a3a'; g.lineWidth = 14; g.strokeRect(18, 18, w - 36, h - 36);
    g.strokeStyle = '#3a5a50'; g.lineWidth = 6; g.strokeRect(38, 38, w - 76, h - 76);
    g.fillStyle = '#8a5a3a';
    g.save(); g.translate(w / 2, h / 2); g.rotate(Math.PI / 4);
    g.fillRect(-60, -60, 120, 120);
    g.restore();
    g.fillStyle = '#3a5a50';
    g.beginPath(); g.arc(w / 2, h / 2, 34, 0, Math.PI * 2); g.fill();
    for (let k = 0; k < 40; k++) {   // threadbare wear
      g.fillStyle = `rgba(200,180,150,${0.04 + rnd() * 0.05})`;
      g.beginPath();
      g.ellipse(rnd() * w, rnd() * h, 14 + rnd() * 30, 6 + rnd() * 14,
        rnd() * Math.PI, 0, Math.PI * 2);
      g.fill();
    }
  });
  const geo = new THREE.PlaneGeometry(4.4, 3.2);
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, 0.006, 0);
  const m = new THREE.MeshLambertMaterial({ map: texRug });
  m.userData.shadeBase = new THREE.Color(0xffffff);
  return [{ geo, mat: m }];
}

// rug two (2026-08-03, James): an old-timey 1920s–30s oriental — deep
// reddish-maroon and brown field, gold woven through, symmetrical floral
// filigree. Drawn with strict four-way quadrant symmetry: everything in
// quadrant() is mirrored across both axes, so the design always reads woven,
// never scattered.
function buildRug2(def, rnd) {
  const tex = signTexture(1024, 712, (g, w, h) => {
    const maroon = '#4d2026', maroonDeep = '#3a181d', brown = '#5a3a28',
      gold = '#b08d46', goldPale = '#c9a95e';
    const FR = 18;                                   // fringe margin, short ends
    g.fillStyle = maroon; g.fillRect(FR, 0, w - FR * 2, h);
    // fringe: knotted cream threads off both short ends
    g.strokeStyle = 'rgba(205,190,158,0.9)'; g.lineWidth = 2.5; g.lineCap = 'round';
    for (let y = 8; y < h - 4; y += 8) {
      g.beginPath(); g.moveTo(FR + 1, y); g.lineTo(4, y + (rnd() - 0.5) * 5); g.stroke();
      g.beginPath(); g.moveTo(w - FR - 1, y); g.lineTo(w - 4, y + (rnd() - 0.5) * 5); g.stroke();
    }
    // border bands: brown guard / gold main / brown guard, framing the field
    const bandRect = (inset, lw, color) => {
      g.strokeStyle = color; g.lineWidth = lw;
      g.strokeRect(FR + inset, inset, w - 2 * (FR + inset), h - 2 * inset);
    };
    bandRect(10, 10, brown);
    bandRect(30, 26, maroonDeep);                    // main band ground
    bandRect(52, 8, brown);
    // main-band ornament: alternating gold rosettes and diamond leaves
    const rosette = (x, y, r, color) => {
      g.fillStyle = color;
      for (let p = 0; p < 8; p++) {
        const a = p * Math.PI / 4;
        g.beginPath();
        g.ellipse(x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55,
          r * 0.42, r * 0.2, a, 0, Math.PI * 2);
        g.fill();
      }
      g.fillStyle = maroonDeep;
      g.beginPath(); g.arc(x, y, r * 0.22, 0, Math.PI * 2); g.fill();
    };
    const diamond = (x, y, r) => {
      g.fillStyle = brown;
      g.beginPath();
      g.moveTo(x - r, y); g.lineTo(x, y - r * 0.6); g.lineTo(x + r, y); g.lineTo(x, y + r * 0.6);
      g.closePath(); g.fill();
    };
    const bandMid = 30 + 13;
    for (let i = 0; ; i++) {                         // top + bottom runs
      const x = FR + 52 + i * 46;
      if (x > w - FR - 52) break;
      (i % 2 ? diamond : rosette)(x, bandMid, i % 2 ? 14 : 11, gold);
      (i % 2 ? diamond : rosette)(x, h - bandMid, i % 2 ? 14 : 11, gold);
    }
    for (let i = 1; ; i++) {                         // left + right runs
      const y = bandMid + i * 46;
      if (y > h - bandMid - 20) break;
      (i % 2 ? diamond : rosette)(FR + bandMid, y, i % 2 ? 14 : 11, gold);
      (i % 2 ? diamond : rosette)(w - FR - bandMid, y, i % 2 ? 14 : 11, gold);
    }
    // the field, in strict 4-way symmetry
    const cx = w / 2, cy = h / 2;
    const fieldW = w / 2 - FR - 64, fieldH = h / 2 - 64;
    const quadrant = () => {
      // corner spandrel: quarter-rosette fan in the field corner
      g.fillStyle = brown;
      g.beginPath(); g.moveTo(fieldW, fieldH);
      g.arc(fieldW, fieldH, 86, Math.PI, Math.PI * 1.5); g.closePath(); g.fill();
      g.fillStyle = goldPale;
      g.beginPath(); g.moveTo(fieldW, fieldH);
      g.arc(fieldW, fieldH, 60, Math.PI, Math.PI * 1.5); g.closePath(); g.fill();
      g.fillStyle = maroonDeep;
      g.beginPath(); g.moveTo(fieldW, fieldH);
      g.arc(fieldW, fieldH, 34, Math.PI, Math.PI * 1.5); g.closePath(); g.fill();
      // filigree vine: corner toward the medallion, leaves + florets on it
      g.strokeStyle = gold; g.lineWidth = 4; g.lineCap = 'round';
      g.beginPath();
      g.moveTo(fieldW - 62, fieldH - 62);
      g.bezierCurveTo(fieldW * 0.62, fieldH * 0.9, fieldW * 0.7, fieldH * 0.42, 176, 96);
      g.stroke();
      g.lineWidth = 2.5;
      g.beginPath();
      g.moveTo(fieldW * 0.72, fieldH * 0.78);
      g.bezierCurveTo(fieldW * 0.5, fieldH * 0.95, fieldW * 0.34, fieldH * 0.7, fieldW * 0.3, fieldH * 0.5);
      g.stroke();
      for (const [lx, ly, la] of [
        [fieldW * 0.66, fieldH * 0.74, 0.6], [fieldW * 0.5, fieldH * 0.62, 1.2],
        [fieldW * 0.38, fieldH * 0.46, 2.0], [fieldW * 0.31, fieldH * 0.58, 2.7],
      ]) {
        g.fillStyle = brown;
        g.beginPath(); g.ellipse(lx, ly, 16, 7, la, 0, Math.PI * 2); g.fill();
        g.fillStyle = goldPale;
        g.beginPath(); g.ellipse(lx, ly, 8, 3.2, la, 0, Math.PI * 2); g.fill();
      }
      rosette(212, 128, 15, goldPale);
      rosette(fieldW * 0.62, fieldH * 0.33, 12, gold);
    };
    for (const sx of [1, -1]) {
      for (const sy of [1, -1]) {
        g.save(); g.translate(cx, cy); g.scale(sx, sy); quadrant(); g.restore();
      }
    }
    // central medallion: lobed gold ring, brown ring, maroon heart, rosette
    const lobed = (R, lobes, color) => {
      g.fillStyle = color;
      g.beginPath();
      for (let t = 0; t <= Math.PI * 2 + 0.01; t += Math.PI / 64) {
        const r = R * (1 + 0.09 * Math.cos(lobes * t));
        const px = cx + Math.cos(t) * r * 1.35, py = cy + Math.sin(t) * r;
        if (t === 0) g.moveTo(px, py); else g.lineTo(px, py);
      }
      g.closePath(); g.fill();
    };
    lobed(112, 12, gold);
    lobed(96, 12, maroonDeep);
    lobed(64, 8, brown);
    rosette(cx, cy, 30, goldPale);
    // threadbare wear, gentler than rug one — it was the good rug once
    for (let k = 0; k < 34; k++) {
      g.fillStyle = `rgba(205,185,155,${0.025 + rnd() * 0.04})`;
      g.beginPath();
      g.ellipse(rnd() * w, rnd() * h, 12 + rnd() * 28, 5 + rnd() * 12,
        rnd() * Math.PI, 0, Math.PI * 2);
      g.fill();
    }
  });
  const geo = new THREE.PlaneGeometry(4.4, 3.06);
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, 0.006, 0);
  const m = new THREE.MeshLambertMaterial({ map: tex });
  m.userData.shadeBase = new THREE.Color(0xffffff);
  return [{ geo, mat: m }];
}

// the welcome mat: coir bristle, worn WELCOME, flat like the rugs
function buildWelcomeMat(def, rnd) {
  const texMat = signTexture(384, 224, (g, w, h) => {
    g.fillStyle = '#6e5b3e'; g.fillRect(0, 0, w, h);       // coir
    for (let k = 0; k < 2600; k++) {                        // bristle noise
      g.fillStyle = `rgba(${70 + rnd() * 60},${55 + rnd() * 45},${28 + rnd() * 26},0.5)`;
      g.fillRect(rnd() * w, rnd() * h, 2, 1);
    }
    g.strokeStyle = '#3e3322'; g.lineWidth = 14; g.strokeRect(9, 9, w - 18, h - 18);
    g.fillStyle = 'rgba(40,32,20,0.82)';
    g.font = '700 58px Georgia, "Times New Roman", serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('WELCOME', w / 2, h / 2 + 2);
    for (let k = 0; k < 26; k++) {                          // worn-through patches
      g.fillStyle = 'rgba(110,91,62,0.5)';
      g.beginPath();
      g.ellipse(rnd() * w, rnd() * h,
        6 + rnd() * 22, 3 + rnd() * 8, rnd() * Math.PI, 0, Math.PI * 2);
      g.fill();
    }
  });
  const geo = new THREE.PlaneGeometry(0.95, 0.55);
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, 0.007, 0);
  const m = new THREE.MeshLambertMaterial({ map: texMat });
  m.userData.shadeBase = new THREE.Color(0xffffff);
  return [{ geo, mat: m }];
}

// the coat rack: pole, three pegs, the mail bag (he is never off duty)
function buildCoatRack() {
  const woodGeos = [];
  const pole = new THREE.CylinderGeometry(0.03, 0.045, 1.9, 8);
  pole.translate(0, 0.95, 0);
  woodGeos.push(pole);
  for (let i = 0; i < 3; i++) {
    const peg = new THREE.CylinderGeometry(0.015, 0.015, 0.22, 6);
    peg.rotateZ(Math.PI / 2 - 0.4);
    peg.rotateY(i * 2.1);
    peg.translate(0, 1.72 - i * 0.06, 0);
    woodGeos.push(peg);
  }
  const bag = new THREE.CapsuleGeometry(0.16, 0.3, 4, 10);
  bag.scale(1, 1, 0.6);
  bag.translate(-0.12, 1.28, 0.17);
  return [
    { geo: mergeGeometries(woodGeos), mat: 'wood' },
    { geo: bag, mat: ownMat(0x7a6a4c, { roughness: 0.95 }) },
  ];
}

// the radiator: nine fins and a feed pipe, long side along x at rotY 0.
// Its fins still speak a little Morse. Mostly complaints.
function buildRadiator() {
  const fins = [];
  for (let i = 0; i < 9; i++) {
    const g = new THREE.CylinderGeometry(0.05, 0.05, 0.78, 8);
    g.translate(i * 0.115 - 0.46, 0.42, 0);
    fins.push(g);
  }
  const top = new THREE.CylinderGeometry(0.035, 0.035, 1.05, 8);
  top.rotateZ(Math.PI / 2);
  top.translate(0, 0.78, 0);
  fins.push(top);
  return [{ geo: mergeGeometries(fins), mat: ownMat(0x5a5148, { roughness: 0.6, metalness: 0.5 }) }];
}

// the pigeonholes, reborn as a placeable: cubbies open toward +z at rotY 0.
// Slot positions are recorded in LOCAL space; refreshDynStations maps the
// first placed unit's slots to world space for the filing routine.
const PIGEON_LOCAL_SLOTS = [];
function buildPigeonholes(def, rnd) {
  const COLS = 6, ROWS = 4, CW = 0.5, CH = 0.42, DEEP = 0.4, LEG = 0.86;
  const W = COLS * CW + 0.08, H = ROWS * CH + 0.08;
  const woodGeos = [];
  const back = uvScale(new THREE.BoxGeometry(W, H, 0.04), W / WOOD_TILE, H / WOOD_TILE);
  back.translate(0, LEG + H / 2, -DEEP / 2);
  woodGeos.push(back);
  for (let r = 0; r <= ROWS; r++) {
    const g = new THREE.BoxGeometry(W, 0.035, DEEP);
    g.translate(0, LEG + r * CH + 0.02, 0);
    woodGeos.push(g);
  }
  for (let cIdx = 0; cIdx <= COLS; cIdx++) {
    const g = new THREE.BoxGeometry(0.035, H, DEEP);
    g.translate(cIdx * CW - W / 2 + 0.04, LEG + H / 2, 0);
    woodGeos.push(g);
  }
  for (const lx of [-W / 2 + 0.1, W / 2 - 0.1]) {      // stout legs
    const leg = new THREE.BoxGeometry(0.08, LEG, 0.3);
    leg.translate(lx, LEG / 2, 0);
    woodGeos.push(leg);
  }
  const bundleGeos = [];
  for (let k = 0; k < 7; k++) {                        // a few resident bundles
    const cIdx = Math.floor(rnd() * COLS), r = Math.floor(rnd() * ROWS);
    const b = new THREE.BoxGeometry(0.3, 0.1 + rnd() * 0.14, 0.24);
    b.rotateY((rnd() - 0.5) * 0.3);
    b.translate(cIdx * CW - W / 2 + CW / 2 + 0.04, LEG + r * CH + 0.12, 0.02);
    bundleGeos.push(b);
  }
  if (!PIGEON_LOCAL_SLOTS.length) {
    for (let cIdx = 0; cIdx < COLS; cIdx++) {
      for (let r = 0; r < ROWS; r++) {
        PIGEON_LOCAL_SLOTS.push(new THREE.Vector3(
          cIdx * CW - W / 2 + CW / 2 + 0.04,
          LEG + r * CH + 0.2,
          DEEP / 2 - 0.04));
      }
    }
  }
  return [
    { geo: uvScale(mergeGeometries(woodGeos), 2, 2), mat: 'wood' },
    { geo: mergeGeometries(bundleGeos), mat: ownMat(0xd8cdae, {}, true) },
  ];
}

let scaleDialTex = null;
let rtsTex = null;
const SURFACE_BUILDERS = {
  'svc-lamp': () => {
    const brassGeos = [];
    const base = new THREE.CylinderGeometry(0.07, 0.09, 0.03, 12);
    base.translate(0, 0.015, 0);
    brassGeos.push(base);
    const stem = new THREE.CylinderGeometry(0.014, 0.014, 0.3, 8);
    stem.rotateZ(0.28);
    stem.translate(0, 0.16, 0);
    brassGeos.push(stem);
    const shade = new THREE.SphereGeometry(0.13, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    shade.scale(1, 0.72, 0.62);
    shade.translate(-0.06, 0.31, 0);
    const shadeMat = ownMat(0x1d4a2a, {
      roughness: 0.3, metalness: 0.2,
      emissive: 0x2a6b30, emissiveIntensity: 0.7, side: THREE.DoubleSide,
    });
    shadeMat.userData.keepEmissive = true;     // the green glow IS the lamp
    const disc = new THREE.CircleGeometry(0.11, 12);
    disc.rotateX(-Math.PI / 2);
    disc.translate(-0.06, 0.29, 0);
    const discMat = new THREE.MeshBasicMaterial({ color: 0xd8ffb0, side: THREE.DoubleSide });
    discMat.userData.shadeBase = new THREE.Color(0xd8ffb0);
    return [
      { geo: mergeGeometries(brassGeos), mat: ownMat(0x9a8446, { roughness: 0.3, metalness: 0.9 }) },
      { geo: shade, mat: shadeMat },
      { geo: disc, mat: discMat },
    ];
  },
  'svc-papers': (rnd) => {
    const geos = [];
    let y = 0;
    for (let i = 0; i < 3; i++) {
      const th = 0.045;
      const ream = new THREE.BoxGeometry(0.24, th, 0.32);
      ream.rotateY((rnd() - 0.5) * 0.22);
      ream.translate((rnd() - 0.5) * 0.03, y + th / 2, (rnd() - 0.5) * 0.03);
      geos.push(ream);
      y += th;
    }
    return [{ geo: mergeGeometries(geos), mat: ownMat(0xd8cdae, {}, true) }];
  },
  'svc-rts': () => {
    if (!rtsTex) {
      rtsTex = signTexture(256, 300, (g, w, h) => {
        g.fillStyle = '#cfc2a0'; g.fillRect(0, 0, w, h);
        g.fillStyle = '#3a3226';
        g.font = '700 44px "Courier New", monospace';
        g.textAlign = 'center';
        ['RETURN', 'TO', 'SENDER', 'TO', 'NOWHERE'].forEach((t, i) => g.fillText(t, w / 2, 56 + i * 52));
      });
    }
    const g = new THREE.PlaneGeometry(0.3, 0.36);
    g.rotateZ(0.04);
    g.translate(0, 0.19, 0);
    const m = new THREE.MeshLambertMaterial({ map: rtsTex, side: THREE.DoubleSide });
    m.userData.shadeBase = new THREE.Color(0xffffff);
    return [{ geo: g, mat: m }];
  },
  'parcel': (rnd) => {
    const w = 0.3 + rnd() * 0.22, h = 0.18 + rnd() * 0.16, d = 0.24 + rnd() * 0.18;
    const g = new THREE.BoxGeometry(w, h, d);
    g.rotateY((rnd() - 0.5) * 0.9);
    g.translate(0, h / 2, 0);
    const m = new THREE.MeshLambertMaterial({ map: texParcel });
    m.userData.shadeBase = new THREE.Color(0xffffff);
    return [{ geo: g, mat: m }];
  },
  'svc-coffee': () => {
    const plate = new THREE.CylinderGeometry(0.11, 0.13, 0.05, 14);
    plate.translate(-0.1, 0.025, 0);
    const pot = new THREE.CylinderGeometry(0.09, 0.105, 0.19, 14);
    pot.translate(-0.1, 0.145, 0);
    const cups = [];
    for (let i = 0; i < 3; i++) {
      const c = new THREE.CylinderGeometry(0.035, 0.03, 0.07, 10);
      c.translate(0.15, 0.035 + i * 0.072, -0.03);
      cups.push(c);
    }
    return [
      { geo: plate, mat: ownMat(0x2b2b2d, { roughness: 0.55, metalness: 0.7 }) },
      { geo: pot, mat: ownMat(0x2a1c10, { roughness: 0.25 }) },
      { geo: mergeGeometries(cups), mat: ownMat(0xd8d2c4, { roughness: 0.6 }) },
    ];
  },
  'svc-donuts': (rnd) => {
    const box = new THREE.BoxGeometry(0.42, 0.05, 0.3);
    box.translate(0, 0.025, 0);
    const boxMat = new THREE.MeshLambertMaterial({ map: texParcel });
    boxMat.userData.shadeBase = new THREE.Color(0xffffff);
    const byColor = new Map();
    const icings = [0xc98a9a, 0x8a5a38, 0xd8c9a0];
    for (let i = 0; i < 6; i++) {
      const donut = new THREE.TorusGeometry(0.045, 0.02, 8, 14);
      donut.rotateX(Math.PI / 2 + 0.1);
      donut.rotateY(rnd() * Math.PI);
      donut.translate(-0.11 + (i % 3) * 0.115, 0.065, -0.055 + Math.floor(i / 3) * 0.11);
      const c = icings[i % 3];
      if (!byColor.has(c)) byColor.set(c, []);
      byColor.get(c).push(donut);
    }
    const parts = [{ geo: box, mat: boxMat }];
    for (const [c, geos] of byColor) {
      parts.push({ geo: mergeGeometries(geos), mat: ownMat(c, { roughness: 0.8 }) });
    }
    return parts;
  },
  'svc-lunchbox': () => {
    const body = new THREE.BoxGeometry(0.3, 0.16, 0.14);
    body.translate(0, 0.08, 0);
    const handle = new THREE.TorusGeometry(0.05, 0.009, 6, 12, Math.PI);
    handle.translate(0, 0.16, 0);
    return [
      { geo: body, mat: ownMat(0x3e5a48, { roughness: 0.5, metalness: 0.5 }) },
      { geo: handle, mat: ownMat(0x2b2b2d, { roughness: 0.55, metalness: 0.7 }) },
    ];
  },
  'svc-scale': () => {
    if (!scaleDialTex) {
      scaleDialTex = signTexture(128, 128, (g) => {
        g.clearRect(0, 0, 128, 128);
        g.fillStyle = '#d8d2c4';
        g.beginPath(); g.arc(64, 64, 60, 0, Math.PI * 2); g.fill();
        g.strokeStyle = '#26221c'; g.lineWidth = 6;
        g.beginPath(); g.arc(64, 64, 56, 0, Math.PI * 2); g.stroke();
        g.lineWidth = 3;
        for (let i = 0; i < 12; i++) {
          const a = i * Math.PI / 6;
          g.beginPath();
          g.moveTo(64 + Math.cos(a) * 44, 64 + Math.sin(a) * 44);
          g.lineTo(64 + Math.cos(a) * 52, 64 + Math.sin(a) * 52);
          g.stroke();
        }
        g.lineWidth = 4;
        g.beginPath(); g.moveTo(64, 64); g.lineTo(38, 34); g.stroke();   // stuck needle
      });
    }
    const base = new THREE.BoxGeometry(0.3, 0.05, 0.3);
    base.translate(0, 0.025, 0.05);
    const col = new THREE.CylinderGeometry(0.02, 0.02, 0.3, 8);
    col.translate(0, 0.2, -0.08);
    const dial = new THREE.PlaneGeometry(0.2, 0.2);
    dial.translate(0, 0.42, -0.08);
    const dialMat = new THREE.MeshLambertMaterial({ map: scaleDialTex, transparent: true, side: THREE.DoubleSide });
    dialMat.userData.shadeBase = new THREE.Color(0xffffff);
    return [
      { geo: mergeGeometries([base, col]), mat: ownMat(0x2b2b2d, { roughness: 0.55, metalness: 0.7 }) },
      { geo: dial, mat: dialMat },
    ];
  },
  'svc-twine': () => {
    const g = new THREE.SphereGeometry(0.07, 10, 8);
    g.translate(0, 0.07, 0);
    return [{ geo: g, mat: ownMat(0xc9b98a, { roughness: 0.98 }) }];
  },
  'svc-ledger': () => {
    const ledger = new THREE.BoxGeometry(0.3, 0.05, 0.42);
    ledger.rotateY(-0.2);
    ledger.translate(0.05, 0.025, 0.02);
    const ink = new THREE.CylinderGeometry(0.03, 0.035, 0.07, 10);
    ink.translate(-0.18, 0.035, -0.08);
    return [
      { geo: ledger, mat: ownMat(0x5a3a2a, { roughness: 0.7 }) },
      { geo: ink, mat: ownMat(0x1a2438, { roughness: 0.3 }) },
    ];
  },
};

// GLB placeables clone a Meshy prop (chair / couch / plant) — the source loads
// once per file, every item gets its own materials so shade stays per-item
const furnLoader = new GLTFLoader();
const glbFurnCache = new Map();
function glbFurnSource(file) {
  if (!glbFurnCache.has(file)) {
    glbFurnCache.set(file, new Promise((resolve, reject) => {
      furnLoader.load(`assets/props/${file}`, (gltf) => {
        const src = gltf.scene;
        const box = new THREE.Box3().setFromObject(src);
        resolve({
          src,
          size: box.getSize(new THREE.Vector3()),
          min: box.min.clone(),
          center: box.getCenter(new THREE.Vector3()),
        });
      }, undefined, reject);
    }));
  }
  return glbFurnCache.get(file);
}
// def.wear (2026-08-04, James's ask): stamp a tile over a prop's own texture
// at light opacity — one composited canvas, one material, no transparency
// pass. wear: { alpha: 0.15, repeat: 2 } rusts a black wastebasket gently.
function applyWear(mat, wear) {
  const srcImg = mat.map?.image;
  if (!srcImg || !srcImg.width) return;
  const c = document.createElement('canvas');
  c.width = srcImg.width; c.height = srcImg.height;
  const g = c.getContext('2d');
  g.drawImage(srcImg, 0, 0);
  g.globalAlpha = wear.alpha ?? 0.15;
  const n = wear.repeat ?? 2;
  const tile = texRust.image;                       // the shared rust canvas
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      g.drawImage(tile, i * c.width / n, j * c.height / n, c.width / n, c.height / n);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = mat.map.colorSpace;
  t.flipY = mat.map.flipY;
  t.wrapS = mat.map.wrapS; t.wrapT = mat.map.wrapT;
  t.anisotropy = mat.map.anisotropy;
  mat.map = t;
  if (mat.emissiveMap) mat.emissiveMap = t;         // dual-atlas: wear both copies
}

function fillGlbFurniture(record, def) {
  glbFurnSource(def.glb).then(({ src, size, min, center }) => {
    if (!furnitureRecords.includes(record)) return;   // removed while loading
    const inst = src.clone(true);
    const stem = def.glb.match(/(\w+)\.glb/)[1];
    const mats = [];
    inst.traverse((o) => {
      if (!o.isMesh || !o.material) return;
      if (def.keepMats) {                             // Meshy-textured props keep their atlas
        o.material = o.material.clone();
        if (def.wear) applyWear(o.material, def.wear);
        if (o.material.emissiveMap) {                 // dual-atlas: faint self-light, not 1.0
          o.material.emissiveIntensity = 0.25;
          o.material.userData.keepEmissive = true;
        }
      } else {
        const name = o.material.name || '';
        let key = Object.keys(PROP_MATERIALS).find((k) => name.startsWith(k));
        if (!key) key = stem === 'plant' ? 'prop_plant_leaf' : 'prop_' + stem;
        o.material = PROP_MATERIALS[key] ? PROP_MATERIALS[key]() : o.material.clone();
      }
      if (def.tint) o.material.color.multiply(new THREE.Color(def.tint));
      o.material.userData.shadeBase = o.material.color.clone();
      mats.push(o.material);
    });
    if (def.radio) {                                  // the placeable radio: clickable + glow
      const meshes = [];
      inst.traverse((o) => {
        if (!o.isMesh) return;
        propClickables.radio.add(o);
        meshes.push(o);
        if (o.material.emissiveMap) {
          o.material.emissiveIntensity = radioOn ? 0.42 : 0.22;
          o.material.userData.keepEmissive = true;
          radioGlowMats.push(o.material);
        }
      });
      hoverDirty = true;
      record.cleanup = () => {
        for (const o of meshes) {
          propClickables.radio.delete(o);
          const gi = radioGlowMats.indexOf(o.material);
          if (gi >= 0) radioGlowMats.splice(gi, 1);
        }
        hoverDirty = true;
      };
    }
    const norm = new THREE.Group();
    inst.position.set(-center.x, -min.y, -center.z);
    norm.add(inst);
    norm.scale.setScalar(def.gh / size.y);
    if (def.sink) norm.position.y = -def.sink;   // optional floor tuck
    record.group.add(norm);
    record.mats.push(...mats);
    applyShade(record.mats, record.item.shade);
    record.group.traverse((o) => { o.updateMatrix?.(); o.matrixAutoUpdate = false; });
    record.group.updateMatrixWorld(true);
  }).catch(() => console.warn('[dlo] furniture glb failed:', def.glb));
}

// per-item materials (map shared, color owns the shade) so shade is live-tunable
const SHADE_BASE = { steel: 0x4a4f46, boxes: 0xffffff, wood: 0xffffff };
function furnitureMaterial(kind) {
  const m = kind === 'steel'
    ? new THREE.MeshStandardMaterial({ color: 0x4a4f46, roughness: 0.5, metalness: 0.6 })
    : kind === 'wood'
      ? new THREE.MeshStandardMaterial({ map: texWood, roughness: 0.8 })
      : new THREE.MeshLambertMaterial({ map: boxAtlasTex });
  m.userData.shadeBase = new THREE.Color(SHADE_BASE[kind]);
  return m;
}
function applyShade(mats, shade) {
  for (const m of mats) {
    m.color.copy(m.userData.shadeBase).multiplyScalar(shade);
    // clear any nav-warning tint — except mats whose emissive IS the look
    // (the banker's-lamp shade, the radio's dial glow)
    if (!m.userData.keepEmissive) m.emissive?.setScalar(0);
  }
}

const furnitureRecords = [];                        // live {item, group, mats} list
function buildFurnitureItem(item) {
  const def = FURNITURE[item.type];
  if (!def) return null;
  const rnd = mulberry32((item.seed ?? 1) * 2654435761 >>> 0 || 1);
  const parts = def.glb ? []                        // filled async below
    : def.table ? buildTable(def)
      : def.cab ? buildCabinetBank(def, rnd)
      : def.book ? buildBookshelf(def, rnd)
        : def.rug ? (def.rug === 2 ? buildRug2(def, rnd) : buildRug(def, rnd))
        : def.rack ? buildCoatRack(def, rnd)
        : def.radi ? buildRadiator(def, rnd)
        : def.wmat ? buildWelcomeMat(def, rnd)
          : def.pig ? buildPigeonholes(def, rnd)
            : SURFACE_BUILDERS[item.type] ? SURFACE_BUILDERS[item.type](rnd)
              : def.n !== undefined ? buildStack(def, rnd)
                : item.type === 'crate' ? buildCrate(def, rnd)
                  : buildShelf(def, rnd);
  const group = new THREE.Group();
  const mats = [];
  for (const part of parts) {
    const mat = part.mat.isMaterial ? part.mat : furnitureMaterial(part.mat);
    mats.push(mat);
    group.add(new THREE.Mesh(part.geo, mat));
  }
  // surface clutter carries a y (height of whatever it sits on); floor
  // furniture always sits at 0
  group.position.set(item.x, def.surf ? (item.y ?? 0) : 0, item.z);
  group.rotation.y = item.rotY;
  group.scale.setScalar(item.scale);
  applyShade(mats, item.shade);
  scene.add(group);
  group.traverse((o) => { o.updateMatrix(); o.matrixAutoUpdate = false; });
  group.updateMatrixWorld(true);
  const record = { item, group, mats, surf: Boolean(def.surf) };
  furnitureRecords.push(record);
  if (def.glb) fillGlbFurniture(record, def);
  return record;
}
function removeFurnitureItem(record) {
  const at = furnitureRecords.indexOf(record);
  if (at >= 0) furnitureRecords.splice(at, 1);
  const li = archiveLayout.items.indexOf(record.item);
  if (li >= 0) archiveLayout.items.splice(li, 1);
  scene.remove(record.group);
  record.cleanup?.();                 // radio: deregister clickables + glow mats
  for (const m of record.mats) m.dispose();
}

// The layout: assets/layout.js (script tag — file:// safe) when present and
// furniture-shaped, else the seed below. Arrange mode (?arrange=1, served)
// edits it live and saves through PUT /api/worlds/dead-letter-office/layout.
const DLO_DEFAULT_LAYOUT = {
  kind: 'furniture',
  items: [
    { type: 'shelf-double', x: -2.3, z: 3.05, rotY: 0, scale: 1, shade: 1, seed: 11 },
    { type: 'shelf-double', x: 2.3, z: 3.05, rotY: 0, scale: 1, shade: 1, seed: 12 },
    { type: 'shelf-single', x: -1.075, z: -5.72, rotY: 0, scale: 1, shade: 1, seed: 13 },
    { type: 'shelf-single', x: 0.95, z: 5.72, rotY: Math.PI, scale: 1, shade: 1, seed: 14 },
    { type: 'shelf-single', x: 8.72, z: 5.35, rotY: -Math.PI / 2, scale: 0.9, shade: 0.92, seed: 15 },
    { type: 'crate', x: -2.0, z: 5.25, rotY: 0.12, scale: 1, shade: 1, seed: 16 },
    { type: 'crate', x: -2.05, z: 5.3, rotY: -0.2, scale: 0.9, shade: 0.95, seed: 17 },
    { type: 'crate', x: -3.3, z: 5.4, rotY: 0.35, scale: 0.85, shade: 1.05, seed: 18 },
    { type: 'stack-3', x: 8.62, z: 4.85, rotY: -1.4, scale: 1, shade: 1, seed: 19 },
    { type: 'stack-2', x: -1.7, z: 5.35, rotY: 0.4, scale: 1, shade: 1, seed: 20 },
    { type: 'stack-2', x: -3.95, z: -5.6, rotY: 1.2, scale: 1, shade: 1, seed: 21 },
    // the classic furnishing, as placeables (2026-08-03) — seeds fresh visitors
    // only; James's saved layout.js is the real room
    { type: 'couch', x: -5.0, z: -5.5, rotY: 0, scale: 1, shade: 1, seed: 40 },
    { type: 'coffee-table', x: -5.2, z: -4.3, rotY: 0.05, scale: 1, shade: 1, seed: 41 },
    { type: 'chair', x: -6.35, z: -4.35, rotY: 0.16, scale: 1, shade: 0.86, seed: 42 },
    { type: 'chair', x: -4.0, z: -4.25, rotY: 3.2, scale: 0.98, shade: 0.78, seed: 43 },
    { type: 'plant-big', x: -3.5, z: -5.25, rotY: 3.6, scale: 1, shade: 1, seed: 44 },
    { type: 'plant-small', x: -5.2, y: 0.42, z: -4.3, rotY: 1.9, scale: 1, shade: 1, seed: 45 },
    // west of the desk now — the old spot sat on the walk into his new lane
    { type: 'work-table', x: -0.5, z: -5.0, rotY: 0, scale: 1, shade: 1, seed: 46 },
    { type: 'svc-coffee', x: -0.78, y: 0.78, z: -5.05, rotY: 0, scale: 1, shade: 1, seed: 47 },
    { type: 'svc-donuts', x: -0.22, y: 0.78, z: -4.95, rotY: 0.15, scale: 1, shade: 1, seed: 48 },
    { type: 'svc-lunchbox', x: -0.84, y: 0.78, z: -4.8, rotY: -0.3, scale: 1, shade: 1, seed: 49 },
    { type: 'big-table', x: -8.25, z: 4.4, rotY: 0, scale: 1, shade: 1, seed: 50 },
    { type: 'svc-scale', x: -8.3, y: 0.78, z: 3.8, rotY: Math.PI, scale: 1, shade: 1, seed: 51 },
    { type: 'svc-twine', x: -8.42, y: 0.78, z: 4.18, rotY: 0, scale: 1, shade: 1, seed: 52 },
    { type: 'svc-ledger', x: -8.2, y: 0.78, z: 4.95, rotY: 0, scale: 1, shade: 1, seed: 53 },
    { type: 'parcel', x: -8.3, y: 0.78, z: 4.45, rotY: 0.2, scale: 1, shade: 1, seed: 54 },
    { type: 'bookshelf', x: 8.69, z: 1.1, rotY: -Math.PI / 2, scale: 1, shade: 1, seed: 55 },
    { type: 'parcel', x: -6.4, z: 5.35, rotY: 0.4, scale: 1.2, shade: 1, seed: 56 },
    { type: 'parcel', x: 3.9, z: -5.5, rotY: 0.25, scale: 1.2, shade: 1, seed: 57 },
    // the desk set (flipped: he works behind it), cabinets, radio — placeables
    // since the same date
    { type: 'desk', x: 2.5, z: -4.9, rotY: Math.PI, scale: 1, shade: 1, seed: 58 },
    { type: 'chair', x: 3.05, z: -5.62, rotY: 0.15, scale: 1, shade: 1, seed: 59 },
    { type: 'svc-lamp', x: 2.12, y: 0.76, z: -4.355, rotY: 3.64, scale: 1, shade: 1, seed: 60 },
    { type: 'svc-mug', x: 2.92, y: 0.76, z: -4.56, rotY: 2.39, scale: 1, shade: 1, seed: 61 },
    { type: 'svc-papers', x: 2.66, y: 0.76, z: -4.495, rotY: 0, scale: 1, shade: 1, seed: 62 },
    { type: 'svc-rts', x: 2.86, y: 0.44, z: -4.44, rotY: 0, scale: 1, shade: 1, seed: 63 },
    { type: 'cabinet-bank', x: 8.21, z: -2.46, rotY: -Math.PI / 2, scale: 1, shade: 1, seed: 64 },
    { type: 'radio', x: 8.2, y: 1.32, z: -3.55, rotY: -1.16, scale: 1, shade: 1, seed: 65 },
    // the rug, the pigeonholes (2026-08-03, second pass)
    { type: 'rug', x: 2.7, z: -4.3, rotY: 0, scale: 1, shade: 1, seed: 66 },
    { type: 'pigeonholes', x: 6.25, z: -5.74, rotY: 0, scale: 1, shade: 1, seed: 67 },
    // coat rack + radiator (2026-08-03, third pass — everything movable now)
    { type: 'coat-rack', x: 8.4, z: -5.35, rotY: 0, scale: 1, shade: 1, seed: 68 },
    { type: 'radiator', x: -8.68, z: -2.0, rotY: Math.PI / 2, scale: 1, shade: 1, seed: 69 },
    { type: 'welcome-mat', x: -8.38, z: 2.6, rotY: Math.PI / 2, scale: 1, shade: 1, seed: 70 },
  ],
};
const savedLayout = globalThis.DEAD_LETTER_OFFICE_LAYOUT;
const archiveLayout = (savedLayout && savedLayout.kind === 'furniture'
  && Array.isArray(savedLayout.items)) ? savedLayout : DLO_DEFAULT_LAYOUT;
for (const item of archiveLayout.items) buildFurnitureItem(item);

// (the cabinet-top stray boxes are gone — 2026-08-03 clean-room pass; James
// re-clutters with placeable boxes and parcels now)

/* ================= table + parcel helpers (builders use these) ================ */

function mkTable(x, z, w, d, h, ry) {
  const g = new THREE.Group();
  const top = new THREE.Mesh(uvScale(new THREE.BoxGeometry(w, 0.06, d), w / WOOD_TILE, d / WOOD_TILE), matWood);
  top.position.y = h - 0.03;
  g.add(top);
  for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, h - 0.06, 0.06), matWood);
    leg.position.set(lx * (w / 2 - 0.07), (h - 0.06) / 2, lz * (d / 2 - 0.07));
    g.add(leg);
  }
  g.position.set(x, 0, z);
  g.rotation.y = ry;
  scene.add(g);
  return h;   // tabletop height for dressing
}

// (texParcel/matParcel moved up beside the furnishing builders, 2026-08-03)
function parcel(x, y, z, w, h, d, ry) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), matParcel);
  m.position.set(x, y + h / 2, z);
  m.rotation.y = ry;
  scene.add(m);
}

// (the donut table, big door table, coffee table, and every loose parcel are
// arrange-mode placeables since 2026-08-03 — the builders live in the
// furniture catalog and reuse mkTableParts/parcel-style geometry)


// (the couch corner set and all the fixed parcels became placeables too —
// 2026-08-03; parcel() remains for any builder that wants the shared look)

/* ================= posters, calendar, pin-ups, corkboard ================ */

/* ---- the wall-art catalog (2026-07-28, James: "add all wall art to the
   placeables") — every poster is an arrange-mode item now. Image posters are
   James's GPT art (assets/posters/*.jpg; source PNGs in repo assets/Dead Letter
   Layers/posters); drawn posters render onto cream stock. Positions live in the
   layout (DLO_DEFAULT_ART seeds when the saved layout has no art yet). The
   fixtures — house sign, clock, tallies, corkboard, STAIRS plate — stay put. */

const posterLoader = new THREE.TextureLoader();

function drawLiftPoster(g, w, h) {
  g.font = '700 26px "Courier New", monospace';
  g.fillText('LIFT WITH', w / 2, 46);
  g.fillText('YOUR KNEES', w / 2, 78);
  // stick figure doing it wrong, crossed out
  g.strokeStyle = '#3a3226'; g.lineWidth = 5; g.lineCap = 'round';
  g.beginPath(); g.arc(w / 2 - 20, h * 0.44, 14, 0, Math.PI * 2); g.stroke();
  g.beginPath();
  g.moveTo(w / 2 - 14, h * 0.5); g.lineTo(w / 2 + 14, h * 0.62);   // bent back
  g.lineTo(w / 2 + 10, h * 0.76);
  g.moveTo(w / 2 + 14, h * 0.62); g.lineTo(w / 2 + 34, h * 0.72);
  g.stroke();
  g.strokeStyle = '#8a3a2e'; g.lineWidth = 6;
  g.beginPath(); g.arc(w / 2, h * 0.58, 52, 0, Math.PI * 2); g.stroke();
  g.beginPath(); g.moveTo(w / 2 - 38, h * 0.72); g.lineTo(w / 2 + 38, h * 0.44); g.stroke();
  g.font = '700 22px "Courier New", monospace';
  g.fillText('SORT WITH YOUR HEART', w / 2, h - 26);
}

function drawZipPoster(g, w) {
  g.font = '700 24px "Courier New", monospace';
  g.fillText('ZIP DIRECTORY', w / 2, 40);
  g.font = '400 16px "Courier New", monospace';
  g.textAlign = 'left';
  const rows = ['00000  the void', '03421  ashfield', '11973  the sea (all)',
    '19104  delancey st', '31129  point perpetua', '40213  vane street',
    '66601  the canyon', '75910  the dusk field', '88088  below the shelf',
    '99999  see 00000'];
  rows.forEach((r, i) => g.fillText(r, 24, 72 + i * 24));
}

function drawDeliveryPoster(g, w, h) {
  // Mr. Special Delivery — flexing with a parcel
  g.font = '700 22px "Courier New", monospace';
  g.fillText('MR. SPECIAL', w / 2, 38);
  g.fillText('DELIVERY', w / 2, 64);
  g.strokeStyle = '#3a3226'; g.lineWidth = 4; g.lineCap = 'round';
  const cx = w / 2;
  g.beginPath(); g.arc(cx, 112, 22, 0, Math.PI * 2); g.stroke();       // head
  g.strokeRect(cx - 16, 90, 32, 8);                                    // cap brim
  g.beginPath();                                                        // torso, heroic
  g.moveTo(cx - 30, 138); g.lineTo(cx - 16, 216); g.lineTo(cx + 16, 216); g.lineTo(cx + 30, 138);
  g.closePath(); g.stroke();
  g.beginPath();                                                        // flex arms
  g.moveTo(cx - 30, 144); g.lineTo(cx - 52, 130); g.lineTo(cx - 52, 106);
  g.moveTo(cx + 30, 144); g.lineTo(cx + 52, 130); g.lineTo(cx + 52, 106);
  g.stroke();
  g.strokeRect(cx + 40, 84, 26, 22);                                   // parcel aloft
  g.beginPath();
  g.moveTo(cx - 16, 216); g.lineTo(cx - 16, 254);
  g.moveTo(cx + 16, 216); g.lineTo(cx + 16, 254);
  g.stroke();
  g.font = '400 17px "Courier New", monospace';
  g.fillText('rain nor sleet nor', w / 2, h - 40);
  g.fillText('reasons', w / 2, h - 20);
}

function drawLostPoster(g, w, h) {
  g.font = '700 52px "Courier New", monospace';
  g.fillText('LOST?', w / 2, 64);
  g.strokeStyle = '#3a3226'; g.lineWidth = 5; g.lineCap = 'round';
  g.beginPath(); g.arc(w / 2, 170, 52, 0, Math.PI * 2); g.stroke();     // head
  g.beginPath(); g.moveTo(w / 2 - 44, 140); g.lineTo(w / 2 - 24, 108); g.lineTo(w / 2 - 8, 132); g.stroke();  // ear
  g.beginPath(); g.moveTo(w / 2 + 44, 140); g.lineTo(w / 2 + 24, 108); g.lineTo(w / 2 + 8, 132); g.stroke();
  g.fillRect(w / 2 - 22, 160, 8, 8); g.fillRect(w / 2 + 14, 160, 8, 8); // eyes
  g.beginPath(); g.moveTo(w / 2, 178); g.lineTo(w / 2 - 6, 188); g.lineTo(w / 2 + 6, 188); g.closePath(); g.fill();
  g.font = '400 26px "Courier New", monospace';
  g.fillText('answers to nothing', w / 2, 268);
  g.fillText('reward: none', w / 2, 300);
}

// img entries size from width × aspect; drawn entries carry explicit w/h meters
const WALL_ART = {
  'art-wesee': { label: 'poster: the eye', img: 'poster-wesee.jpg', w: 1.32, aspect: 1.333 },
  'art-calendar': { label: 'poster: egret calendar', img: 'poster-calendar.jpg', w: 1.44, aspect: 0.8 },
  'art-workrules': { label: 'poster: work rules', img: 'poster-workrules.jpg', w: 1.36, aspect: 1.333 },
  'art-happiness': { label: 'poster: happiness', img: 'poster-happiness.jpg', w: 1.24, aspect: 1.5 },
  'art-wanted': { label: 'poster: most wanted', img: 'poster-wanted.jpg', w: 1.36, aspect: 1.333 },
  'art-lift': { label: 'poster: lift w/ knees', w: 0.66, h: 0.84, draw: drawLiftPoster },
  'art-zip': { label: 'poster: zip directory', w: 0.56, h: 0.74, draw: drawZipPoster },
  'art-delivery': { label: 'poster: mr. delivery', w: 0.5, h: 0.7, draw: drawDeliveryPoster },
  'art-lost': { label: 'poster: lost? cat', w: 0.5, h: 0.66, draw: drawLostPoster },
  // the house sign is placeable too (2026-08-03, James) — `full` draws the
  // whole canvas itself, no cream-stock wrapper
  'art-housesign': { label: 'the house sign', w: 2.4, h: 1.2, px: 1024, full: drawHouseSign },
  'art-postmaster': { label: 'sign: john dough', w: 0.88, h: 0.25, px: 640, full: drawPostmasterSign },
  'art-corkboard': { label: 'corkboard', w: 1.05, h: 0.82, px: 512, full: drawCorkboard },
  // live entries share a runtime-updated texture (the counters keep counting
  // wherever they hang); glb entries hang a real Meshy mesh on the wall
  'art-tally-dead': { label: 'counter: dead letters', w: 1.35, h: 0.53, live: 'tallyDead' },
  'art-tally-claimed': { label: 'counter: claimed', w: 1.35, h: 0.53, live: 'tallyClaimed' },
  'art-wallclock': { label: 'clock (pendulum)', glb: 'clock2.glb', gh: 0.85, depth: 0.1, w: 0.42 },
  'art-exitsign': { label: 'exit sign', glb: 'exitsign.glb', gh: 0.3, depth: 0.06, w: 0.47, glow: 0.85 },
};

const drawnArtTexCache = new Map();
function wallArtMaterial(type) {
  const def = WALL_ART[type];
  let tex;
  if (def.live) {
    // shared live canvas (drum counters): unlit so the digits glow like signs
    const mat = new THREE.MeshBasicMaterial({ map: LIVE_ART_TEX[def.live] });
    mat.userData.shadeBase = new THREE.Color(0xffffff);
    return mat;
  }
  if (def.img) {
    tex = posterLoader.load(`assets/posters/${def.img}`);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = maxAniso;
  } else {
    if (!drawnArtTexCache.has(type)) {
      const px = def.px || 256;
      drawnArtTexCache.set(type, signTexture(px, Math.round(px * def.h / def.w), (g, w, h) => {
        if (def.full) { def.full(g, w, h); return; }               // self-contained art
        g.fillStyle = '#cfc2a0'; g.fillRect(0, 0, w, h);            // cream stock
        g.strokeStyle = '#8a7d60'; g.lineWidth = 4; g.strokeRect(6, 6, w - 12, h - 12);
        g.fillStyle = '#3a3226';
        g.textAlign = 'center';
        def.draw(g, w, h);
      }));
    }
    tex = drawnArtTexCache.get(type);
  }
  const mat = new THREE.MeshLambertMaterial({ map: tex });
  mat.userData.shadeBase = new THREE.Color(0xffffff);
  return mat;
}

function buildArtItem(item) {
  const def = WALL_ART[item.type];
  if (!def) return null;
  const group = new THREE.Group();
  const mats = [];
  const record = { item, group, mats, art: true };
  if (def.glb) {
    // a real mesh hung on the wall (the pendulum clock): centered on x/y,
    // pushed off the wall by half its depth, facing +z like every art plane
    glbFurnSource(def.glb).then(({ src, size, center }) => {
      if (!furnitureRecords.includes(record)) return;
      const inst = src.clone(true);
      inst.traverse((o) => {
        if (!o.isMesh || !o.material) return;
        o.material = o.material.clone();
        if (o.material.emissiveMap) {           // Meshy dual atlas: faint self-light
          o.material.emissiveIntensity = def.glow ?? 0.25;   // the EXIT sign earns its glow
          o.material.userData.keepEmissive = true;
        }
        o.material.userData.shadeBase = o.material.color.clone();
        mats.push(o.material);
      });
      const norm = new THREE.Group();
      inst.position.set(-center.x, -center.y, -center.z);
      norm.add(inst);
      norm.scale.setScalar(def.gh / size.y);
      norm.position.z = (def.depth ?? 0.1) / 2;
      group.add(norm);
      applyShade(mats, item.shade);
      group.traverse((o) => { o.updateMatrix?.(); o.matrixAutoUpdate = false; });
      group.updateMatrixWorld(true);
    }).catch(() => console.warn('[dlo] art glb failed:', def.glb));
  } else {
    const hM = def.img ? def.w * def.aspect : def.h;
    const mat = wallArtMaterial(item.type);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(def.w, hM), mat);
    const rnd = mulberry32((item.seed ?? 1) * 2654435761 >>> 0 || 1);
    // posters pin askew; signs and instruments hang straight
    mesh.rotation.z = (def.full || def.live) ? 0 : (rnd() - 0.5) * 0.05;
    group.add(mesh);
    mats.push(mat);
  }
  group.position.set(item.x, item.y ?? 2.0, item.z);
  group.rotation.y = item.rotY;
  group.scale.setScalar(item.scale);
  applyShade(mats, item.shade);
  scene.add(group);
  group.traverse((o) => { o.updateMatrix(); o.matrixAutoUpdate = false; });
  group.updateMatrixWorld(true);
  furnitureRecords.push(record);
  return record;
}

// default placements — where the posters hung before they were placeable
const DLO_DEFAULT_ART = [
  { type: 'art-wesee', x: -2.75, y: 1.78, z: ROOM.z0 + 0.035, rotY: 0, scale: 1, shade: 1, seed: 31 },
  { type: 'art-calendar', x: 0.85, y: 1.98, z: ROOM.z0 + 0.03, rotY: 0, scale: 1, shade: 1, seed: 32 },
  { type: 'art-lost', x: -3.6, y: 1.9, z: ROOM.z0 + 0.02, rotY: 0, scale: 1, shade: 1, seed: 33 },
  { type: 'art-lift', x: -6.8, y: 2.25, z: ROOM.z1 - 0.02, rotY: Math.PI, scale: 1, shade: 1, seed: 34 },
  { type: 'art-zip', x: 2.2, y: 2.3, z: ROOM.z1 - 0.02, rotY: Math.PI, scale: 1, shade: 1, seed: 35 },
  { type: 'art-workrules', x: -0.9, y: 2.4, z: ROOM.z1 - 0.02, rotY: Math.PI, scale: 1, shade: 1, seed: 36 },
  { type: 'art-happiness', x: ROOM.x1 - 0.02, y: 2.35, z: -2.9, rotY: -Math.PI / 2, scale: 1, shade: 1, seed: 37 },
  { type: 'art-delivery', x: ROOM.x1 - 0.02, y: 2.35, z: 1.4, rotY: -Math.PI / 2, scale: 1, shade: 1, seed: 38 },
  { type: 'art-wanted', x: ROOM.x0 + 0.03, y: 2.3, z: 4.5, rotY: Math.PI / 2, scale: 1, shade: 1, seed: 39 },
  { type: 'art-housesign', x: -0.8, y: 2.55, z: ROOM.z0 + 0.02, rotY: 0, scale: 1, shade: 1, seed: 30 },
  { type: 'art-postmaster', x: 2.5, y: 1.8, z: ROOM.z0 + 0.02, rotY: 0, scale: 1, shade: 1, seed: 29 },
  { type: 'art-corkboard', x: ROOM.x0 + 0.03, y: 1.72, z: 0.2, rotY: Math.PI / 2, scale: 1, shade: 1, seed: 28 },
  { type: 'art-tally-dead', x: -6.9, y: 3.15, z: ROOM.z0 + 0.02, rotY: 0, scale: 1, shade: 1, seed: 27 },
  { type: 'art-tally-claimed', x: -6.9, y: 2.5, z: ROOM.z0 + 0.02, rotY: 0, scale: 1, shade: 1, seed: 26 },
  { type: 'art-wallclock', x: 2.6, y: 2.75, z: ROOM.z0 + 0.02, rotY: 0, scale: 1, shade: 1, seed: 25 },
  { type: 'art-exitsign', x: ROOM.x0 + 0.05, y: 2.62, z: 2.6, rotY: Math.PI / 2, scale: 1, shade: 1, seed: 24 },
];
// Seed the classic walls ONLY for a fresh visitor with no layout file at all —
// a saved layout with no art means James emptied the room on purpose
// (2026-08-03, the blank-canvas session) and it must stay empty.
if (archiveLayout === DLO_DEFAULT_LAYOUT && !archiveLayout.items.some((i) => WALL_ART[i.type])) {
  archiveLayout.items.push(...DLO_DEFAULT_ART);
}
for (const item of archiveLayout.items) buildArtItem(item);

// the corkboard with the little stickers (he consults it) — placeable wall
// art since 2026-08-03; the pm's corkboard routine anchors to wherever it hangs
function drawCorkboard(g, w, h) {
  g.fillStyle = '#8a6a48'; g.fillRect(0, 0, w, h);           // cork
  for (let k = 0; k < 400; k++) {
    g.fillStyle = `rgba(${100 + Math.random() * 60},${70 + Math.random() * 40},${40 + Math.random() * 30},0.4)`;
    g.fillRect(Math.random() * w, Math.random() * h, 3, 3);
  }
  g.strokeStyle = '#4a3a26'; g.lineWidth = 14; g.strokeRect(7, 7, w - 14, h - 14);
  // pinned notes, tilted, scribbled
  for (let n = 0; n < 7; n++) {
    const nx = 40 + (n % 4) * 115 + Math.random() * 20;
    const ny = 46 + Math.floor(n / 4) * 150 + Math.random() * 30;
    g.save();
    g.translate(nx, ny);
    g.rotate((Math.random() - 0.5) * 0.3);
    g.fillStyle = n % 3 === 0 ? '#d8cdae' : '#cfc9b8';
    g.fillRect(0, 0, 92, 110);
    g.strokeStyle = 'rgba(58,50,38,0.7)'; g.lineWidth = 2;
    for (let l = 0; l < 6; l++) {
      g.beginPath();
      g.moveTo(10, 24 + l * 14);
      g.lineTo(14 + Math.random() * 66, 24 + l * 14);
      g.stroke();
    }
    g.fillStyle = '#8a3a2e';
    g.beginPath(); g.arc(46, 8, 5, 0, Math.PI * 2); g.fill();   // pin
    g.restore();
  }
  // the little stickers: a status column nobody explains
  const stickers = ['#b04a3a', '#b04a3a', '#c9a24b', '#b04a3a', '#c9a24b', '#b04a3a', '#5a8a4a'];
  stickers.forEach((c, i) => {
    g.fillStyle = c;
    g.beginPath(); g.arc(w - 44, 52 + i * 44, 13, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(58,50,38,0.6)'; g.lineWidth = 2;
    g.beginPath();
    g.moveTo(w - 110, 52 + i * 44); g.lineTo(w - 66, 52 + i * 44);
    g.stroke();
  });
}

// (South-side clutter history: the r1 crates/mail-cart/sacks block lived here.
// The cart + sphere sacks were cut 2026-07-27 on James's screenshot verdict;
// the crates became arrange-mode layout items the same night — see the archive
// stacks section. If a mail cart ever returns it gets built properly.)

// (the rug became the 'rug' placeable, 2026-08-03 — buildRug in the furniture
// catalog section; its texture drawing moved there too)

// (the welcome mat became the 'welcome-mat' placeable, 2026-08-04 —
// buildWelcomeMat in the furniture catalog)

/* ================= ceiling chute over the basket ================= */

{
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.3, 0.62), matPipe);
  mouth.position.set(-4.5, ROOM.h - 0.15, -1.5);
  scene.add(mouth);
  const dark = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.52),
    new THREE.MeshBasicMaterial({ color: 0x050505 }));
  dark.rotation.x = Math.PI / 2;
  dark.position.set(-4.5, ROOM.h - 0.31, -1.5);
  scene.add(dark);
  addSign(signTexture(256, 64, (g, w, h) => {
    g.fillStyle = '#6e6452'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#211d16';
    g.font = '700 34px "Courier New", monospace';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('INCOMING', w / 2, h / 2 + 1);
  }), 0.5, 0.125, -4.5, ROOM.h - 0.36, -1.18, 0);
}

/* ================= Meshy props ================= */

const loader = new GLTFLoader();
const propTex = (worldMeters, extra = {}) => {
  // prop UVs are cube-projected at 0.5m per UV unit (Blender pass)
  const t = texWood.clone();
  t.needsUpdate = true;
  t.repeat.setScalar(0.5 / worldMeters);
  texWood.userData.clones.push(t);
  return new THREE.MeshStandardMaterial({ map: t, roughness: 0.8, ...extra });
};

const PROP_MATERIALS = {
  // the oil tank wears the Meshy rust tile (UVs cube-projected 0.5m/unit in
  // the Blender strip pass, so the repeat reads true to scale)
  prop_oiltank: () => {
    const t = texRust.clone();
    t.needsUpdate = true;
    t.repeat.setScalar(0.4);            // one tile â‰ˆ 1.25 m of steel
    texRust.userData.clones.push(t);
    return new THREE.MeshStandardMaterial({ map: t, roughness: 0.72, metalness: 0.38 });
  },
  prop_desk: () => propTex(WOOD_TILE, { color: 0xb59a78 }),
  prop_chair: () => propTex(WOOD_TILE, { color: 0xa88a68 }),
  prop_basket: () => new THREE.MeshStandardMaterial({ color: 0x5a5c58, roughness: 0.45, metalness: 0.8 }),
  prop_furnace: () => new THREE.MeshStandardMaterial({ color: 0x232120, roughness: 0.6, metalness: 0.55 }),
  prop_plant_leaf: () => new THREE.MeshStandardMaterial({ color: 0x5a6b3a, roughness: 0.9 }),
  prop_plant_pot: () => new THREE.MeshStandardMaterial({ color: 0x9a5a38, roughness: 0.85 }),
  prop_couch: () => new THREE.MeshLambertMaterial({ color: 0x6b7052 }),   // tired olive
  prop_mug: () => new THREE.MeshStandardMaterial({ color: 0xd8d0be, roughness: 0.55 }),
};

let basketRimY = 1.1;           // refined from the basket bbox on load
const raycaster = new THREE.Raycaster();

// (the desk, his chair, and all the desk dressing are placeables since
// 2026-08-03 — 'desk' / 'chair' / 'svc-lamp' / 'svc-mug' / 'svc-papers' /
// 'svc-rts' in the furniture catalog. The JOHN DOUGH wall sign stays fixed.)
const PROPS = [
  {
    file: 'assets/props/basket.glb', height: 1.12, pos: [-4.5, 0, -1.5], rotY: 0,
    then(wrap) {
      const box = new THREE.Box3().setFromObject(wrap);
      basketRimY = box.max.y;
      const placard = addSign(signTexture(256, 96, (g, w, h) => {
        g.fillStyle = '#b0a684'; g.fillRect(0, 0, w, h);
        g.strokeStyle = '#4a4436'; g.lineWidth = 6; g.strokeRect(6, 6, w - 12, h - 12);
        g.fillStyle = '#26221c';
        g.font = '700 40px "Courier New", monospace';
        g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText('DEAD', w / 2, 32);
        g.fillText('LETTERS', w / 2, 68);
      }), 0.44, 0.17, -4.5, 0.62, -0.82, 0);
      placard.rotation.x = -0.08;
    },
  },
  {
    file: 'assets/props/furnace.glb', height: 1.38, pos: [6.8, 0, 3.5], rotY: -2.05,
    then() {
      // stovepipe up through the ceiling + ember glow in the mouth
      const pipeMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, ROOM.h - 1.25, 10), matPipe);
      pipeMesh.position.set(6.8, 1.25 + (ROOM.h - 1.25) / 2, 3.5);
      scene.add(pipeMesh);
      const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.1, 10), matPipe);
      collar.position.set(6.8, 1.3, 3.5);
      scene.add(collar);
      const ember = new THREE.Mesh(new THREE.CircleGeometry(0.1, 12),
        new THREE.MeshBasicMaterial({ color: 0xff8a30 }));
      const fdir = new THREE.Vector3(Math.sin(-2.05), 0, Math.cos(-2.05));
      ember.position.set(6.8 + fdir.x * 0.52, 0.52, 3.5 + fdir.z * 0.52);
      ember.lookAt(ember.position.clone().add(fdir));
      scene.add(ember);
    },
  },
  // (the couch, plants, chairs, desk set, cabinet bank AND the radio are all
  // arrange-mode placeables since 2026-08-03 — the radio keeps its Meshy
  // textures + click-toggle via the def flags keepMats/radio; only the basket
  // and furnace remain fixed props)
];

const furnaceMouth = new THREE.Vector3(6.8 + Math.sin(-2.05) * 0.55, 0.62, 3.5 + Math.cos(-2.05) * 0.55);
const propClickables = { furnace: new Set(), radio: new Set() };

let propsLoaded = 0;
for (const spec of PROPS) {
  loader.load(spec.file, (gltf) => {
    const src = gltf.scene;
    src.traverse((o) => {
      if (!o.isMesh || !o.material) return;
      const name = o.material.name || '';
      for (const key of Object.keys(PROP_MATERIALS)) {
        if (name.startsWith(key)) { o.material = PROP_MATERIALS[key](); return; }
      }
      // unnamed fallback: pick by file
      const stem = spec.file.match(/props\/(\w+)\.glb/)[1];
      const key = stem === 'plant' ? 'prop_plant_leaf' : 'prop_' + stem;
      if (PROP_MATERIALS[key]) o.material = PROP_MATERIALS[key]();
    });
    if (spec.tint) {                       // per-instance mood (the sad plants)
      src.traverse((o) => {
        if (o.isMesh && o.material) o.material.color.multiply(new THREE.Color(spec.tint));
      });
    }
    const box = new THREE.Box3().setFromObject(src);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const s = spec.height / size.y;
    const wrap = new THREE.Group();
    const inst = src;
    inst.position.set(-center.x, -box.min.y, -center.z);
    wrap.add(inst);
    wrap.scale.setScalar(s);
    wrap.position.set(...spec.pos);
    wrap.rotation.y = spec.rotY;
    scene.add(wrap);
    if (spec.file.includes('furnace')) {
      inst.traverse((o) => { if (o.isMesh) propClickables.furnace.add(o); });
      hoverDirty = true;
    }
    if (spec.then) spec.then(wrap);
    propsLoaded += 1;
    const propTotal = PROPS.length + (PM_ENABLED ? 1 : 0);
    if (posterNote) posterNote.textContent = `setting the room… ${propsLoaded}/${propTotal}`;
    // with the postmaster benched, the last prop lifts the loading poster
    if (!PM_ENABLED && propsLoaded >= PROPS.length) posterFadeOut();
  }, undefined, () => console.warn('[dlo] prop failed to load:', spec.file));
}

// (the desk dressing — banker's lamp, mug, papers, RTS sign — became the
// svc-* placeables, 2026-08-03; the JOHN DOUGH wall sign is placeable wall
// art too — WALL_ART 'art-postmaster', drawn by drawPostmasterSign.)

/* ================= the postmaster ================= */

const IDLES = ['idle-1', 'idle-2', 'idle-3'];
const STILL = 0.0001;   // never exactly 0 — the mixer stops rewriting bones

const pmGroup = new THREE.Group();
scene.add(pmGroup);
let pmModel = null, mixer = null, headBone = null, handBone = null, pmProxy = null;
let pmSizeY = 0, pmMinY = 0;   // raw GLB bounds — applyTune derives scale from pmHeight
let armBoneL = null, armBoneR = null;   // v2 arm-splay targets (pmSplay tuner)
let midBone = null;                     // R middle finger — palm anchor for carry
let jawBone = null;                     // CC_Base_JawRoot — viseme jaw rotation
const jawBaseQ = new THREE.Quaternion(); // jaw pose from the clip, pre-viseme
let jawBaseValid = false;
const CARRY_V = new THREE.Vector3();    // scratch for the palm blend
const CARRY_W = new THREE.Vector3();    // wrist position scratch
const CARRY_DIR = new THREE.Vector3();  // wrist->fingers direction scratch
let pmStillOn = false;                  // pmStill museum-mode latch
const SPLAY_Q = new THREE.Quaternion(); // scratch — one alloc, reused per frame
const AXIS_Z = new THREE.Vector3(0, 0, 1);
const pmMats = [];   // his materials — pmGlow tuner drives emissiveIntensity
const actions = {};
let baseAction = null, oneshotAction = null, oneshotDone = null;

function blobShadow() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 8, 64, 64, 62);
  grad.addColorStop(0, 'rgba(0,0,0,0.45)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.9, 0.55),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.012;
  return mesh;
}

function nameOf(action) { return action.getClip().name; }
function pickIdle() { return IDLES[Math.floor(Math.random() * IDLES.length)]; }

function playBase(name, fade = 0.35, timeScale = 1) {
  const next = actions[name];
  if (!next) return;
  next.timeScale = timeScale;
  if (oneshotAction) { oneshotAction.fadeOut(fade); oneshotAction = null; oneshotDone = null; }
  if (baseAction === next) return;
  if (baseAction) baseAction.fadeOut(fade);
  next.reset().setLoop(THREE.LoopRepeat, Infinity).fadeIn(fade).play();
  baseAction = next;
}

function playOneshot(name, done, fade = 0.3) {
  const next = actions[name];
  if (!next || next === oneshotAction) { if (done) done(); return; }
  if (oneshotAction) oneshotAction.fadeOut(fade);
  if (baseAction) baseAction.fadeOut(fade);
  next.reset().setLoop(THREE.LoopOnce, 1).fadeIn(fade).play();
  next.clampWhenFinished = true;
  oneshotAction = next;
  oneshotDone = done || null;
}

// TEMPORARILY BENCHED (James, 2026-08-03): the postmaster stays out of the
// world while the room is re-furnished from scratch — every pm code path
// guards on pmModel, so with the loader skipped he simply never exists.
// Flip PM_ENABLED to true to rehire him (and re-run the nav sim first).
const PM_ENABLED = true;   // rehired 2026-08-04 against James's new room
// PM_V2: John Dough, the CC5 bake (2026-08-04) — walk clip only so far, all
// other clips no-op via the missing-action guards. false = Meshy postmaster.
const PM_V2 = true;
if (PM_ENABLED) Promise.all([
  loader.loadAsync(PM_V2 ? 'assets/postmaster/john-dough.glb' : 'assets/postmaster/postmaster.glb'),
  loader.loadAsync(PM_V2 ? 'assets/postmaster/iclone-pack.glb' : 'assets/postmaster/anim-pack.glb'),
]).then(([modelGltf, packGltf]) => {
  pmModel = modelGltf.scene;
  const bbox = new THREE.Box3().setFromObject(pmModel);
  const size = bbox.getSize(new THREE.Vector3());
  // Height is a tuner dial since r15 (pmHeight, default 1.9 — James: the 1.68
  // round-man read was too small against the furniture). applyTune rescales live.
  pmSizeY = size.y;
  pmMinY = bbox.min.y;
  const scale = tune.pmHeight / size.y;
  pmModel.scale.setScalar(scale);
  pmModel.position.y = -bbox.min.y * scale;
  pmModel.traverse((o) => {
    if (!o.isMesh || !o.material) return;
    // Meshy dual atlas, now on purpose (James r4: "just lighten him up so I can
    // always see him"): the emissive copy stays at PARTIAL strength — he glows
    // with his own colors so the face reads in any corner, and the room's real
    // light still layers on top. pmGlow in the tuner is the knob.
    // The CC5 bake ships no emissive at all — recreate the Meshy dual-atlas
    // trick by hand so the pmGlow contract (always visible) holds for v2 too.
    if (PM_V2 && o.material.map && !o.material.emissiveMap) o.material.emissiveMap = o.material.map;
    if (o.material.emissive) o.material.emissive.set(0xffffff);
    o.material.emissiveIntensity = tune.pmGlow;
    // v1 (Meshy atlas) needed the flat-roughness override; the CC5 bake ships
    // real per-material roughness — flattening it was part of the "looks like
    // clay" gap, so v2 keeps its own values.
    if (!PM_V2) o.material.roughness = 0.85;
    // Hair: two fixes. (r20, James: "should always be white") the CC hair
    // albedo itself is DARK — lift every texel hard toward white in place,
    // alpha untouched, then (r17) no mips: white strands on black transparent
    // texels average dark at distance otherwise.
    if (/Hair|Scalp/.test(o.material.name)) {
      const src = o.material.map;
      if (src && src.image && src.image.width && !src.userData.whitened) {
        const c = document.createElement('canvas');
        c.width = src.image.width; c.height = src.image.height;
        const g = c.getContext('2d');
        g.drawImage(src.image, 0, 0);
        const px = g.getImageData(0, 0, c.width, c.height);
        const d = px.data;
        for (let i = 0; i < d.length; i += 4) {
          d[i] = 255 - (255 - d[i]) * 0.18;
          d[i + 1] = 255 - (255 - d[i + 1]) * 0.18;
          d[i + 2] = 255 - (255 - d[i + 2]) * 0.18;
        }
        g.putImageData(px, 0, 0);
        const t = new THREE.CanvasTexture(c);
        t.flipY = src.flipY;
        t.colorSpace = THREE.SRGBColorSpace;
        t.wrapS = src.wrapS; t.wrapT = src.wrapT;
        t.userData.whitened = true;
        o.material.map = t;
        o.material.emissiveMap = t;   // the dual-atlas rule: swap BOTH maps
      }
      o.material.color.set(0xffffff);
      for (const t of [o.material.map, o.material.emissiveMap]) {
        if (t) { t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; t.needsUpdate = true; }
      }
    }
    o.material.needsUpdate = true;
    pmMats.push(o.material);
    o.frustumCulled = false;   // skinned mesh: bind-pose bounds lie once he walks
  });
  pmGroup.add(pmModel);
  pmGroup.add(blobShadow());
  // Click/hover proxy: raycasting the skinned mesh itself does CPU per-triangle
  // skinning math every test — it was the r2 "slows down when he's near" lag.
  // The capsule is never rendered (material.visible=false skips the draw call
  // but Mesh.raycast still tests it).
  pmProxy = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.42, 0.95, 4, 8),
    new THREE.MeshBasicMaterial({ visible: false }));
  pmProxy.position.y = 0.92;
  pmGroup.add(pmProxy);
  headBone = pmModel.getObjectByName(PM_V2 ? 'CC_Base_Head' : 'Head');
  handBone = pmModel.getObjectByName(PM_V2 ? 'CC_Base_R_Hand' : 'RightHand');
  // mouth meshes for the voice: body + conforming beard pieces all carry
  // V_Open / Jaw_Open — drive them together or the whiskers detach from the jaw
  pmModel.traverse((o) => {
    if (!o.isMesh || !o.morphTargetDictionary) return;
    const iMerged = o.morphTargetDictionary.Merged_Open_Mouth;   // THE speaking key
    const iOpen = o.morphTargetDictionary.V_Open;                // subtle viseme flavor
    const iJaw = o.morphTargetDictionary.Jaw_Open;
    if (iMerged !== undefined || iOpen !== undefined || iJaw !== undefined) {
      pmMouthMeshes.push({ mesh: o, iMerged, iOpen, iJaw });
    }
  });
  // the hand joint IS the wrist — carried letters embedded in the forearm
  // (r15 "paper bracelet"). Blending toward the middle finger seats the
  // letter in the palm across any pose.
  midBone = pmModel.getObjectByName('CC_Base_R_Mid1');
  jawBone = pmModel.getObjectByName('CC_Base_JawRoot');
  if (PM_V2) {
    armBoneL = pmModel.getObjectByName('CC_Base_L_Upperarm');
    armBoneR = pmModel.getObjectByName('CC_Base_R_Upperarm');
  }

  mixer = new THREE.AnimationMixer(pmModel);
  for (const clip of packGltf.animations) {
    if (clip.name.includes('|')) continue;   // stray unnamed export
    actions[clip.name] = mixer.clipAction(clip);
  }
  if (PM_V2 && actions.walk && !actions['idle-1']) {
    // no idle clips yet: freeze a feet-passing instant of the walk as a
    // stand-in pose so he doesn't drop to the calibration T-pose at stations
    const walkClip = actions.walk.getClip();
    for (const n of IDLES) {
      const pose = THREE.AnimationUtils.subclip(walkClip, n, 9, 11, 24);
      actions[n] = mixer.clipAction(pose);
    }
  }
  mixer.addEventListener('finished', (e) => {
    if (e.action !== oneshotAction) return;
    oneshotAction = null;
    // release the clamped end pose or every later clip shrinks (2026-07-17 bug)
    e.action.fadeOut(0.35);
    const done = oneshotDone;
    oneshotDone = null;
    if (!baseAction || baseAction.getEffectiveWeight() < 0.5) {
      const name = baseAction ? nameOf(baseAction) : pickIdle();
      baseAction = null;
      playBase(name);
    }
    if (done) done();
  });

  // home is the desk when one is placed; the middle of the room otherwise
  const homeKey = PM_STATIONS.desk ? 'desk' : 'wander1';
  pmStationKey = homeKey;
  pmGroup.position.set(PM_STATIONS[homeKey].x, 0, PM_STATIONS[homeKey].z);
  pmYaw = PM_STATIONS[homeKey].face;
  pmFaceTarget = pmYaw;   // or the settle branch pivots him toward the π
                          // default on planted feet the moment he appears
  pmGroup.rotation.y = pmYaw;
  hoverDirty = true;   // he just joined the click targets
  // first pose lands with ZERO fade + an immediate mixer evaluation: a fade
  // here blends up from the calibration T-pose, so he flashed a split-second
  // scarecrow at load (James, 2026-08-10)
  if (reducedMotion) {
    playBase('idle-2', 0, STILL);
  } else {
    playBase(pickIdle(), 0);
    pmScheduleNext(6.5);   // James: give him another beat before the first round
  }
  mixer.update(0);   // bones written before the next rendered frame
  propsLoaded += 1;
  posterFadeOut();
}).catch(() => fail('Could not load the postmaster. ' + SERVE_HINT));

function posterFadeOut() {
  if (!poster) return;
  poster.style.transition = 'opacity 1.1s ease';
  poster.style.opacity = '0';
  setTimeout(() => { poster.style.display = 'none'; }, 1200);
}

/* ================= navigation graph (verified in tools sim) ================= */

const PM_STATIONS = {
  basket:    { x: -3.3, z: -0.6, face: -2.21 },
  furnace:   { x: 5.7, z: 2.6, face: 0.885 },
  clock:     { x: -7.9, z: 1.2, face: -Math.PI / 2 },
  // moved to the south-west window 2026-08-04 — James parked the oil tank in
  // front of the west one, so the postmaster gazes out a different pane now
  window:    { x: -5.6, z: 4.8, face: 0.05 },
  doorSt:    { x: -8.1, z: 2.6, face: -Math.PI / 2 },
  wander1:   { x: 0, z: 1.5, face: 0 },
  wander2:   { x: -1.5, z: -2.5, face: Math.PI },
  wander3:   { x: 3.5, z: 1.8, face: 0.4 },
  // 'desk', 'coffee', 'couch' and 'cabinets' are DYNAMIC since 2026-08-03 —
  // they anchor to placed items (refreshDynStations) and vanish with them
};

const NAV_NODES = {
  H1: { x: 0, z: 0.8 },
  H2: { x: -4.0, z: 1.2 },
  H3: { x: 4.6, z: 0.6 },
  H4: { x: -6.8, z: 2.2 },
  H5: { x: 4.9, z: 3.4 },
  H7: { x: 4.35, z: -3.6 },
  ...PM_STATIONS,
};
const NAV_EDGES = [
  ['H7', 'H3'],
  ['H3', 'H1'], ['H3', 'H5'], ['H3', 'furnace'], ['H3', 'wander3'],
  ['H5', 'furnace'],
  ['H1', 'H2'], ['H1', 'wander1'], ['H1', 'wander2'], ['H1', 'basket'],
  ['H2', 'basket'], ['H2', 'H4'],
  ['H4', 'clock'], ['H4', 'window'], ['H4', 'doorSt'],
];
let NAV_ADJ = {};
let dynNavEdges = [];
function buildNavAdj() {
  NAV_ADJ = {};
  for (const [a, b] of [...NAV_EDGES, ...dynNavEdges]) {
    (NAV_ADJ[a] = NAV_ADJ[a] || []).push(b);
    (NAV_ADJ[b] = NAV_ADJ[b] || []).push(a);
  }
}
buildNavAdj();

// Dynamic stations (2026-08-03): his workplaces anchor to whatever James
// places — the desk, the work table, the couch, the cabinet bank. Each
// anchors a stand-off point on the item's front side (for the desk that IS
// his side — its rotY convention faces the user) and wires itself to the
// nearest hub with a clear straight walk; with no item placed the routine
// retires. Also re-anchors the banker's-lamp light and the radio position.
const DYN_STATIONS = {
  desk:     { type: 'desk', gap: 0.35 },
  coffee:   { type: 'work-table', gap: 0.45 },
  couch:    { type: 'couch', gap: 0.45 },
  cabinets: { type: 'cabinet-bank', gap: 0.45 },
  pigeon:   { type: 'pigeonholes', gap: 0.5 },
  corkboard: { type: 'art-corkboard', gap: 0.5 },   // wall art anchors too
};
const DYN_HUBS = ['H1', 'H2', 'H3', 'H4', 'H5', 'H7', 'wander1', 'wander2', 'wander3'];
function refreshDynStations() {
  dynNavEdges = [];
  for (const [key, cfg] of Object.entries(DYN_STATIONS)) {
    const type = cfg.type;
    delete PM_STATIONS[key];
    delete NAV_NODES[key];
    delete NAV_NODES[key + 'Side'];
    const item = archiveLayout.items.find((i) => i.type === type);
    if (!item) continue;
    const def = FURNITURE[type] || WALL_ART[type];   // corkboard is wall art
    const isArtStation = !FURNITURE[type];
    const d = ((def.fd ?? 0.05) / 2) * (item.scale ?? 1) + cfg.gap;
    const st = {
      x: item.x + Math.sin(item.rotY) * d,
      z: item.z + Math.cos(item.rotY) * d,
      face: item.rotY + Math.PI,
    };
    // clamp into the room, skip if the stand-off lands buried in a keep-out
    st.x = Math.min(ROOM.x1 - 0.5, Math.max(ROOM.x0 + 0.5, st.x));
    st.z = Math.min(ROOM.z1 - 0.5, Math.max(ROOM.z0 + 0.5, st.z));
    const deepIn = (x, z, [x0, x1, z0, z1]) =>
      x > x0 + 0.15 && x < x1 - 0.15 && z > z0 + 0.15 && z < z1 - 0.15;
    // NO exemption for the item's own box — a straight walk that cuts through
    // the furniture reads as clipping; blocked approaches route via a side point
    const segClear = (a, b) => {
      for (let t = 0; t <= 1.0001; t += 0.04) {
        const x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t;
        for (const rec of furnitureRecords) {
          if (rec.surf || rec.art || !FURNITURE[rec.item.type]) continue;
          if (deepIn(x, z, itemKeepOut(rec.item))) return false;
        }
        for (const box of STATIC_BOXES) if (deepIn(x, z, box)) return false;
      }
      return true;
    };
    const nearestHubTo = (p) => {
      let best = null, bestD = Infinity;
      for (const hub of DYN_HUBS) {
        const n = NAV_NODES[hub];
        if (!n) continue;
        const dist = Math.hypot(n.x - p.x, n.z - p.z);
        if (dist < bestD && segClear(n, p)) { bestD = dist; best = hub; }
      }
      return best;
    };
    const direct = nearestHubTo(st);
    if (direct) {
      PM_STATIONS[key] = st;
      NAV_NODES[key] = st;
      dynNavEdges.push([direct, key]);
      continue;
    }
    // wall art has no footprint to sidestep — if no hub reaches it, it retires
    if (isArtStation) continue;
    // no clean straight shot (e.g. behind the desk): try stepping around the
    // item's side at station depth, then hub â†’ side â†’ station
    const [bx0, bx1] = itemKeepOut(item);
    let wired = false;
    for (const sx of [bx0 - 0.45, bx1 + 0.45]) {
      const side = {
        x: Math.min(ROOM.x1 - 0.5, Math.max(ROOM.x0 + 0.5, sx)),
        z: st.z,
      };
      if (!segClear(side, st)) continue;
      const hub = nearestHubTo(side);
      if (!hub) continue;
      PM_STATIONS[key] = st;
      NAV_NODES[key] = st;
      NAV_NODES[key + 'Side'] = side;
      dynNavEdges.push([hub, key + 'Side'], [key + 'Side', key]);
      wired = true;
      break;
    }
    if (!wired) continue;                // nowhere clear to approach from
  }
  buildNavAdj();

  // the banker's-lamp light follows the first placed lamp (dark when none)
  const lampItem = archiveLayout.items.find((i) => i.type === 'svc-lamp');
  lampPlaced = Boolean(lampItem);
  if (lampItem) {
    lampLight.position.set(lampItem.x, (lampItem.y ?? 0) + 0.28, lampItem.z);
  }
  lampLight.intensity = lampPlaced ? tune.lamp : 0;

  // floor lamps really cast light (James, 2026-08-04) — a pool of two warm
  // points rides the first two placed 'floor-lamp' items; more lamps than
  // that still glow by texture but don't add lights (perf)
  const lampItems = archiveLayout.items.filter((i) => i.type === 'floor-lamp');
  floorLampLights.forEach((l, i) => {
    const it = lampItems[i];
    if (it) {
      l.position.set(it.x, 1.38 * (it.scale ?? 1), it.z);
      l.intensity = 1.15;
    } else {
      l.intensity = 0;
    }
  });

  // the radio's sound source follows the first placed radio
  const radioItem = archiveLayout.items.find((i) => i.type === 'radio');
  if (radioItem) RADIO_POS.set(radioItem.x, (radioItem.y ?? 0) + 0.18, radioItem.z);

  // pigeonhole slots follow the first placed unit (local â†’ world); empty
  // array = nowhere to file, the basket routine burns everything instead
  pigeonholeSlots.length = 0;
  const pigItem = archiveLayout.items.find((i) => i.type === 'pigeonholes');
  if (pigItem && PIGEON_LOCAL_SLOTS.length) {
    const s = pigItem.scale ?? 1;
    const cos = Math.cos(pigItem.rotY), sin = Math.sin(pigItem.rotY);
    for (const p of PIGEON_LOCAL_SLOTS) {
      pigeonholeSlots.push(new THREE.Vector3(
        pigItem.x + (p.x * cos + p.z * sin) * s,
        p.y * s,
        pigItem.z + (-p.x * sin + p.z * cos) * s));
    }
  }
}
let lampPlaced = false;

function navRoute(fromKey, toKey) {
  if (fromKey === toKey) return [toKey];
  const prev = { [fromKey]: null };
  const q = [fromKey];
  while (q.length) {
    const n = q.shift();
    for (const m of NAV_ADJ[n] || []) {
      if (m in prev) continue;
      prev[m] = n;
      if (m === toKey) {
        const path = [m];
        let p = n;
        while (p) { path.unshift(p); p = prev[p]; }
        return path;
      }
      q.push(m);
    }
  }
  return [fromKey, toKey];   // fallback: straight line (graph is connected; belt+braces)
}

/* ================= postmaster shift brain ================= */

let pmYaw = Math.PI;
let pmState = 'station';        // station | walking | busy
let pmStationKey = 'desk';
let pmPath = [];                // remaining [x,z] waypoints
let pmNextAt = Infinity;        // when to pick the next routine (perf.now ms)
let pmCarried = null;           // envelope mesh being carried
let pmFaceCamera = 0;           // >0: seconds left of facing the visitor

function pmScheduleNext(seconds) {
  pmNextAt = performance.now() + seconds * 1000 * tune.pace;
}

function pmWalkTo(stationKey, arrived) {
  if (!NAV_NODES[stationKey]) {   // a dynamic station whose furniture left mid-plan
    pmState = 'station';
    pmScheduleNext(4 + Math.random() * 4);
    return;
  }
  const route = navRoute(pmStationKey, stationKey);
  pmPath = route.slice(1).map((k) => NAV_NODES[k]);
  pmStationKey = stationKey;
  if (!pmPath.length) {
    // already there — walking to where you stand left him treadmilling forever
    // (the stuck-in-place bug James saw); arrive immediately instead
    pmState = 'station';
    const st = PM_STATIONS[stationKey];
    if (st) pmFaceTarget = st.face;
    if (arrived) arrived();
    else pmScheduleNext(6 + Math.random() * 6);
    return;
  }
  pmState = 'walking';
  pmArrived = arrived || null;
  pmSpeed = 0;   // he accelerates from a stand — see the zero-skate block in pmTick
  pmLock = null;
  pmLegMin = Infinity;
  // walk-think BENCHED from the rotation (2026-08-10, James: "miracle on
  // ice") — its mid-take pondering pauses need a smoothed velocity bake and
  // a look-dev pass before it can plant clean. The clip stays in the pack.
  pmLoopName = 'walk';
  const sm = motionMeta();
  if (sm && sm.clips['walk-start'] && actions['walk-start'] && motionK()) {
    // r20: the real step-out take — LoopOnce, and pmTick drives the ground
    // from its measured foot-travel curve so the first strides plant clean
    pmPhase = 'start';
    pmPhaseT = Math.max(0, (sm.clips['walk-start'].lead || 0) - 0.2);
    playPhaseClip('walk-start', 0.15, pmPhaseT);
  } else {
    pmPhase = 'loop';
    pmLoopT = 0;
    // 0.324 m/s per meter of height is the walk loop's measured TREADMILL
    // speed (planted-foot travel integrated over the full loop). This is
    // only the first frame's guess: pmTick re-locks timeScale to the LIVE
    // ground speed every frame (r19), covering fade-in, pivots and arrival.
    playBase(pmLoopName, 0.3, 0.0001);
  }
}
let pmArrived = null;
let pmSpeed = 0;   // commanded ground speed, m/s — eased; drives timeScale only
let pmLoopName = 'walk';
let pmPhase = 'loop';   // 'start' | 'loop' | 'end' — the r20 gait phases
let pmPhaseT = 0;       // last consumed clip-time of the current phase take
let pmLoopT = 0;        // last consumed clip-time of the loop (curve-driven)

// r20 helpers: start/end takes play LoopOnce as the base action while the
// world replays their measured root travel (assets/postmaster/motion-meta.js,
// generated by build_pack.py from planted-foot integration).
function playPhaseClip(name, fade = 0.15, startAt = 0) {
  const a = actions[name];
  if (!a) return null;
  if (oneshotAction) { oneshotAction.fadeOut(fade); oneshotAction = null; oneshotDone = null; }
  if (baseAction && baseAction !== a) baseAction.fadeOut(fade);
  a.reset().setLoop(THREE.LoopOnce, 1).fadeIn(fade).play();
  a.clampWhenFinished = true;
  a.time = startAt;
  a.timeScale = 1;
  baseAction = a;
  return a;
}
// r20.2: the raw fwd curves carry the hips' within-stride surge (the
// "squishy" drift James called out). Smooth each curve once (±6-frame box
// filter) and force it monotonic non-decreasing — a foot-travel integral
// can only go forward; any backward wiggle is measurement noise.
let motionMetaClean = false;
function motionMeta() {
  const m = globalThis.DLO_MOTION_META || null;
  if (m && !motionMetaClean) {
    motionMetaClean = true;
    for (const cm of Object.values(m.clips)) {
      // ±3 frames (0.05s each side): kills the 60Hz measurement noise that
      // made r20.1 squishy but keeps the ~1.7Hz stride pulse James wants
      const src = cm.fwd, n = src.length, out = new Array(n);
      for (let i = 0; i < n; i++) {
        let sum = 0, cnt = 0;
        for (let j = Math.max(0, i - 3); j <= Math.min(n - 1, i + 3); j++) { sum += src[j]; cnt++; }
        out[i] = sum / cnt;
      }
      for (let i = 1; i < n; i++) out[i] = Math.max(out[i], out[i - 1]);
      cm.fwd = out;
      // r21 foot-anchor prep: stance heights + the take's heading angle
      // (planted feet sweep opposite the heading; align it to local +z)
      if (cm.feetL && cm.feetR) {
        const zmin = (arr) => arr.reduce((v, p) => Math.min(v, p[2]), Infinity);
        cm.zMinL = zmin(cm.feetL);
        cm.zMinR = zmin(cm.feetR);
        let vx = 0, vy = 0;
        for (const [arr, zm] of [[cm.feetL, cm.zMinL], [cm.feetR, cm.zMinR]]) {
          for (let i = 1; i < arr.length; i++) {
            if (arr[i][2] < zm + 0.035 && arr[i - 1][2] < zm + 0.035) {
              vx += arr[i - 1][0] - arr[i][0];
              vy += arr[i - 1][1] - arr[i][1];
            }
          }
        }
        const l = Math.hypot(vx, vy) || 1;
        const phi = -Math.atan2(vx / l, -(vy / l));
        cm.cphi = Math.cos(phi);
        cm.sphi = Math.sin(phi);
      }
    }
  }
  return m;
}
// r21: world-space offset of a clip foot from the character origin. Clip data
// is Blender-plane (x,y); rotate so the take's heading is +z, flip to three's
// (x,z) (glTF: z = -blenderY), then rotate by the live yaw and scale to world.
// r21.2: FLOAT frame index — the renderer interpolates between keyframes, so
// the anchor must too (rounding to whole frames left a ~7mm 60Hz sawtooth)
function pmFootAt(cm, foot, f) {
  const arr = foot === 'L' ? cm.feetL : cm.feetR;
  const i = Math.max(0, Math.min(arr.length - 1, Math.floor(f)));
  const j = Math.min(arr.length - 1, i + 1);
  const u = Math.min(1, Math.max(0, f - i));
  return [arr[i][0] + (arr[j][0] - arr[i][0]) * u,
    arr[i][1] + (arr[j][1] - arr[i][1]) * u,
    arr[i][2] + (arr[j][2] - arr[i][2]) * u];
}
function pmFootOffset(cm, foot, f, k) {
  const p = pmFootAt(cm, foot, f);
  const qx = cm.cphi * p[0] - cm.sphi * p[1];
  const qy = cm.sphi * p[0] + cm.cphi * p[1];
  const lx = qx, lz = -qy;
  const c = Math.cos(pmYaw), s = Math.sin(pmYaw);
  return [(lx * c + lz * s) * k, (-lx * s + lz * c) * k];
}
let pmLock = null;        // { clip, foot: 'L'|'R', x, z } — the planted anchor
let pmLegMin = Infinity;  // closest approach to the current nav node

// ---- the gait meter (r21.2, ?gait=1) ----
// James: "I have to dispute that your calculation ability is better than
// eyes." Fair — the gait-sim measures the MODEL of him, not the rendered
// man (crossfades, interpolation and bone re-writes all live outside it).
// This measures the actual rendered ankle bones every frame and reports
// per-stance world drift in mm, on screen, next to his feet's truth.
const GAIT_METER = new URLSearchParams(location.search).has('gait');
let gaitEl = null;
const gaitV = new THREE.Vector3();
const gaitState = {
  L: { bone: null, down: false, ref: null, drift: 0, turning: false },
  R: { bone: null, down: false, ref: null, drift: 0, turning: false },
  // straight stances and turning stances scored separately (James: "you're
  // getting massively dinged on the turns" — he was right; pivots have no
  // turn take and sweep the free foot in an arc the meter counted as drift)
  S: { worst: 0, last: 0, n: 0, sum: 0 },
  T: { worst: 0, last: 0, n: 0, sum: 0 },
  prevYaw: null,
};
function gaitMeterTick() {
  if (!GAIT_METER || !pmModel) return;
  if (!gaitEl) {
    gaitState.L.bone = pmModel.getObjectByName('CC_Base_L_Foot');
    gaitState.R.bone = pmModel.getObjectByName('CC_Base_R_Foot');
    if (!gaitState.L.bone || !gaitState.R.bone) return;
    gaitEl = document.createElement('div');
    gaitEl.style.cssText = 'position:fixed;left:10px;bottom:10px;z-index:40;'
      + 'font:12px monospace;color:#ffe9bd;background:rgba(10,12,11,0.75);'
      + 'padding:6px 9px;border:1px solid #3a453f;border-radius:4px;cursor:copy';
    gaitEl.title = 'click to copy';
    gaitEl.addEventListener('click', () => {
      navigator.clipboard.writeText(gaitEl.textContent).then(() => {
        gaitEl.style.borderColor = '#ffe9bd';
        setTimeout(() => { gaitEl.style.borderColor = '#3a453f'; }, 400);
      }).catch(() => {});
    });
    document.body.appendChild(gaitEl);
  }
  const walking = pmState === 'walking';
  const yawRate = gaitState.prevYaw === null ? 0
    : Math.abs(pmYaw - gaitState.prevYaw) * 60;   // rad/s-ish at 60fps
  gaitState.prevYaw = pmYaw;
  for (const key of ['L', 'R']) {
    const f = gaitState[key];
    f.bone.getWorldPosition(gaitV);
    // self-calibrating plant gate (r21.3: a fixed 0.11m counted the whole
    // swing as "planted" — this shuffler's ankle barely lifts): track each
    // foot's rolling low/high water and gate at 30% of its own travel,
    // with hysteresis, only counting once real travel has been observed
    if (f.lo === undefined) { f.lo = gaitV.y; f.hi = gaitV.y; }
    f.lo = gaitV.y < f.lo ? gaitV.y : f.lo + (gaitV.y - f.lo) * 0.0005;
    f.hi = gaitV.y > f.hi ? gaitV.y : f.hi + (gaitV.y - f.hi) * 0.0005;
    const range = f.hi - f.lo;
    const gate = f.lo + range * (f.down ? 0.42 : 0.3);
    const down = walking && range > 0.015 && gaitV.y < gate;
    if (down && !f.down) { f.ref = { x: gaitV.x, z: gaitV.z }; f.drift = 0; f.turning = false; }
    else if (down && f.ref) {
      f.drift = Math.max(f.drift,
        Math.hypot(gaitV.x - f.ref.x, gaitV.z - f.ref.z));
      if (yawRate > 0.5) f.turning = true;
    } else if (!down && f.down && f.ref) {
      const bucket = f.turning ? gaitState.T : gaitState.S;
      bucket.last = f.drift * 1000;
      bucket.worst = Math.max(bucket.worst, bucket.last);
      bucket.n += 1; bucket.sum += bucket.last;
    }
    f.down = down;
  }
  let lockLine = 'lock: none';
  if (pmLock && gaitState[pmLock.foot] && gaitState[pmLock.foot].bone) {
    // where the anchor believes the locked foot is vs where it is RENDERED —
    // a growing err = my clip->world mapping is wrong; an age stuck near
    // zero = the lock is flickering and never accumulates compensation
    gaitState[pmLock.foot].bone.getWorldPosition(gaitV);
    const err = Math.hypot(gaitV.x - pmLock.x, gaitV.z - pmLock.z) * 1000;
    lockLine = 'lock ' + pmLock.foot + '  age ' + (pmLock.age || 0).toFixed(2)
      + 's  err ' + err.toFixed(0) + 'mm';
  }
  const line = (b) => b.last.toFixed(0) + '/'
    + (b.n ? (b.sum / b.n).toFixed(0) : '0') + '/'
    + b.worst.toFixed(0) + 'mm (' + b.n + ')';
  gaitEl.textContent = 'plant drift last/mean/worst  STRAIGHT '
    + line(gaitState.S) + '  TURNING ' + line(gaitState.T)
    + '  |  ' + lockLine;
}
function motionK() {   // world meters per native foot-travel unit
  // r21.1: this is EXACTLY the model's render scale (pmHeight / raw GLB
  // height ≈ 1.06), measured, replacing the r16 "0.324/m of height"
  // constant, which implied 1.533 — 45% over. That one bad constant made
  // the feet step ~45% slower than the ground moved from r16 on (James's
  // ever-present glide), and made the anchor over-shove the body.
  return pmSizeY > 0 ? tune.pmHeight / pmSizeY : 0;
}
function motionCurveAt(cm, t) {
  const f = clamp(t, 0, cm.dur) * cm.fps;
  const i = Math.floor(f);
  const a = cm.fwd[Math.min(i, cm.fwd.length - 1)];
  const b = cm.fwd[Math.min(i + 1, cm.fwd.length - 1)];
  return a + (b - a) * (f - i);
}
function clipCruise(name) {   // world m/s the clip's feet cover at timeScale 1
  const m = motionMeta();
  if (m && m.speeds && m.speeds[name]) return m.speeds[name] * motionK();
  return 0.425;   // measured walk fallback: 0.4015 native × 1.059 scale
}

function pmSpeakFrom(pool) {
  if (Math.random() < 0.55) speak(pool[Math.floor(Math.random() * pool.length)]);
}

// one envelope mesh rides the right hand while he carries a letter
function makeCarriedEnvelope() {
  const group = envelopeMesh(Math.floor(Math.random() * LETTERS.length), false);
  group.scale.setScalar(0.9);
  scene.add(group);
  return group;
}

// finish a station visit: back to station state, next routine queued
function pmDone(min = 8, spread = 10) {
  pmState = 'station';
  pmScheduleNext(min + Math.random() * spread);
}

// away through the stairwell door (doorBreak): gone for a bit, then back
let pmAwayUntil = 0;
let pmAway = false;

const PM_ROUTINES = [
  { key: 'deskwork', station: 'desk', w: 0.15 },
  { key: 'basketRun', station: 'basket', w: 0.17 },
  { key: 'coffee', station: 'coffee', w: 0.11 },
  { key: 'clock', station: 'clock', w: 0.07 },
  { key: 'window', station: 'window', w: 0.07 },
  { key: 'corkboard', station: 'corkboard', w: 0.1 },
  { key: 'cabinets', station: 'cabinets', w: 0.1 },
  { key: 'firePoke', station: 'furnace', w: 0.08 },
  { key: 'doorBreak', station: 'doorSt', w: 0.06 },
  { key: 'couchSit', station: 'couch', w: 0.09 },
  { key: 'wander', station: null, w: 0.09 },
];

function pmRoutine() {
  // never re-pick the station he's already standing at (except desk, which has
  // an in-place work branch) — walking to your own feet was the treadmill bug.
  // Dynamic stations (coffee, couch) drop out when their furniture isn't placed.
  const options = PM_ROUTINES.filter((r) =>
    (r.key === 'deskwork' || !r.station || r.station !== pmStationKey)
    && (!r.station || PM_STATIONS[r.station]));
  let total = 0;
  for (const r of options) total += r.w;
  let roll = Math.random() * total;
  let pick = options[options.length - 1];
  for (const r of options) { roll -= r.w; if (roll <= 0) { pick = r; break; } }

  if (pick.key === 'deskwork') {
    if (pmStationKey !== 'desk') {
      pmWalkTo('desk', () => { playBase(pickIdle()); pmDone(9, 9); });
    } else {
      pmState = 'busy';
      const g = Math.random();
      const clip = g < 0.4 ? 'scheme' : g < 0.6 ? 'shrug' : g < 0.8 ? 'wag-no' : 'sigh';
      if (clip === 'scheme') setTimeout(() => playThunk(), 1400);
      playOneshot(clip, () => pmDone(8, 10));
    }
  } else if (pick.key === 'basketRun') {
    pmWalkTo('basket', () => {
      const source = takeBasketEnvelope();
      if (!source) {
        pmSpeakFrom(PM_BASKET_EMPTY_LINES);
        pmState = 'busy';
        playOneshot('shrug', () => pmDone(9, 8));
        return;
      }
      pmState = 'busy';
      playOneshot('bow', () => {
        pmCarried = makeCarriedEnvelope();
        // no pigeonholes placed â†’ everything goes in the furnace
        const burn = Math.random() < 0.45
          || !PM_STATIONS.pigeon || !pigeonholeSlots.length;
        pmWalkTo(burn ? 'furnace' : 'pigeon', burn ? pmBurnCarried : pmFileCarried);
      });
    });
  } else if (pick.key === 'coffee') {
    pmWalkTo('coffee', () => {
      pmState = 'busy';
      if (Math.random() < 0.5) {
        pmSpeakFrom(PM_COFFEE_LINES);
        const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.038, 0.09, 10),
          new THREE.MeshStandardMaterial({ color: 0x8a8378, roughness: 0.7 }));
        scene.add(mug);
        pmCarried = mug;
        playOneshot('sigh', () => {         // long breath: blowing on it
          playSfx(sfxSip, 0.7);
          scene.remove(mug);
          pmCarried = null;
          pmDone(10, 10);
        });
      } else {                              // or: a donut from the Tuesday box
        pmSpeakFrom(PM_DONUT_LINES);
        const donut = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.02, 8, 14),
          new THREE.MeshStandardMaterial({ color: 0xc98a9a, roughness: 0.8 }));
        scene.add(donut);
        pmCarried = donut;
        playOneshot('scratch', () => {
          scene.remove(donut);
          pmCarried = null;
          pmDone(9, 9);
        });
      }
    });
  } else if (pick.key === 'clock') {
    pmWalkTo('clock', () => {
      pmState = 'busy';
      pmSpeakFrom(PM_CLOCK_LINES);
      playOneshot('alert', () => {
        playSfx(sfxPunch, 0.8);
        punchFlash = 1.2;
        pmDone(9, 9);
      });
    });
  } else if (pick.key === 'window') {
    pmWalkTo('window', () => {
      pmState = 'busy';
      playOneshot('sigh', () => pmDone(10, 10));
    });
  } else if (pick.key === 'corkboard') {
    pmWalkTo('corkboard', () => {
      pmState = 'busy';
      pmSpeakFrom(PM_CORKBOARD_LINES);
      playOneshot(Math.random() < 0.5 ? 'alert' : 'scratch', () => pmDone(9, 9));
    });
  } else if (pick.key === 'cabinets') {
    pmWalkTo('cabinets', () => {
      pmState = 'busy';
      pmSpeakFrom(PM_CABINET_LINES);
      playOneshot(Math.random() < 0.5 ? 'scratch' : 'wag-no', () => pmDone(9, 9));
    });
  } else if (pick.key === 'firePoke') {
    pmWalkTo('furnace', () => {
      pmState = 'busy';
      pmSpeakFrom(PM_POKE_LINES);
      playOneshot('scheme', () => {          // poking at it
        furnaceFlare = Math.max(furnaceFlare, 0.4);
        playSfx(sfxWhoosh, 0.35);
        pmDone(10, 10);
      });
    });
  } else if (pick.key === 'doorBreak') {
    pmWalkTo('doorSt', () => {
      pmState = 'busy';
      playOneshot('scratch', () => {
        pmGroup.visible = false;             // out the door, up the stairs
        pmAway = true;
        hoverDirty = true;                   // his click proxy leaves with him
        pmAwayUntil = performance.now() + 18000 + Math.random() * 25000;
      });
    });
  } else if (pick.key === 'couchSit') {
    pmWalkTo('couch', () => {
      pmState = 'busy';
      pmSpeakFrom(PM_COUCH_LINES);
      playOneshot('look-around', () => {     // the seated clip, finally at home
        if (Math.random() < 0.4) playOneshot('doze', () => pmDone(10, 10));
        else pmDone(10, 10);
      });
    });
  } else {                                   // wander somewhere he isn't
    const spots = ['wander1', 'wander2', 'wander3'].filter((w) => w !== pmStationKey);
    const w = spots[Math.floor(Math.random() * spots.length)];
    pmWalkTo(w, () => {
      playBase(pickIdle());
      // sometimes a small gesture out in the open
      if (Math.random() < 0.4) {
        pmState = 'busy';
        playOneshot(['scratch', 'doze', 'stomp', 'shrug'][Math.floor(Math.random() * 4)],
          () => pmDone(6, 8));
      } else {
        pmDone(6, 8);
      }
    });
  }
}

function pmBurnCarried() {
  pmState = 'busy';
  pmSpeakFrom(PM_FURNACE_LINES);
  playOneshot('scheme', () => {            // striking the match
    if (pmCarried) tossEnvelope(pmCarried, furnaceMouth.clone(), () => {
      furnaceFlare = 1;
      playSfx(sfxWhoosh, 0.9);
    });
    pmCarried = null;
    playOneshot('wave', () => {            // the toss itself
      pmState = 'station';
      pmScheduleNext(10 + Math.random() * 12);
    });
  });
}

function pmFileCarried() {
  if (!pigeonholeSlots.length) { pmBurnCarried(); return; }   // unit vanished mid-walk
  pmState = 'busy';
  pmSpeakFrom(PM_FILE_LINES);
  const slot = pigeonholeSlots[Math.floor(Math.random() * pigeonholeSlots.length)];
  setTimeout(() => {
    if (pmCarried) tossEnvelope(pmCarried, slot.clone(), () => playFlutter(0.5));
    pmCarried = null;
  }, 700);
  playOneshot('shrug', () => {
    pmState = 'station';
    pmScheduleNext(9 + Math.random() * 10);
  });
}

// flying envelope: hand -> target along a little arc, then gone…
const flights = [];
function tossEnvelope(mesh, target, onLand) {
  const from = mesh.position.clone();
  flights.push({ mesh, from, target, t: 0, dur: 0.7, arc: 0.35, onLand });
}
// …or a low slide that keeps the mesh (mound overflow onto the floor)
function slideEnvelope(mesh, target, onLand) {
  const from = mesh.position.clone();
  flights.push({ mesh, from, target, t: 0, dur: 0.55, arc: 0.1, keep: true, onLand });
}

function pmTick(dt, now) {
  if (!pmModel || reducedMotion) return;

  // pmStill (tuner): museum mode — stop all clips (bind A-pose) and hold
  // position so James can inspect the model. Release resumes the routine.
  if (tune.pmStill >= 0.5) {
    if (!pmStillOn) {
      pmStillOn = true;
      oneshotAction = null;
      pmPath.length = 0;
      pmState = 'station';
      // out to open floor (wander1, room center) facing the room — the QA
      // stand can't be behind the desk where the keep-outs block approach
      pmGroup.position.set(0, 0, 1.5);
      pmYaw = Math.PI;
      pmGroup.rotation.y = pmYaw;
      // natural stance, not the A-pose (James can't look at it): idle-1 held
      // at ~zero speed — mixer keeps running so face/mouth stay free to move
      playBase('idle-1', 0.3, STILL);
    }
    return;
  } else if (pmStillOn) {
    pmStillOn = false;
    playBase(pickIdle());
    pmDone(2, 2);
  }

  if (pmAway) {
    if (now >= pmAwayUntil) {              // back down the stairs
      pmAway = false;
      pmGroup.visible = true;
      hoverDirty = true;
      speak(PM_DOOR_RETURN_LINES[Math.floor(Math.random() * PM_DOOR_RETURN_LINES.length)]);
      pmWalkTo('desk', () => { playBase(pickIdle()); pmDone(8, 8); });
    }
    return;
  }

  if (pmState === 'walking' && !pmPath.length) {
    pmState = 'station';                   // belt + braces vs the treadmill bug
    pmPhase = 'loop';
    pmDone(4, 4);
  }
  if (pmState === 'walking' && pmPath.length) {
    const next = pmPath[0];
    const dx = next.x - pmGroup.position.x;
    const dz = next.z - pmGroup.position.z;
    const dist = Math.hypot(dx, dz);
    const targetYaw = Math.atan2(dx, dz);
    let dYaw = targetYaw - pmYaw;
    while (dYaw > Math.PI) dYaw -= Math.PI * 2;
    while (dYaw < -Math.PI) dYaw += Math.PI * 2;
    pmYaw += clamp(dYaw, -3.2 * dt, 3.2 * dt);
    // zero-skate (r19/r20): feet and ground are locked every frame. In the
    // loop phase timeScale tracks the eased ground speed; in the start/end
    // takes the ground follows the take's own measured foot-travel curve,
    // so the step-out and the settle plant clean too. Pivoting slows the
    // whole take (align) — feet and floor slow down together.
    const align = clamp(Math.cos(dYaw), 0.12, 1);
    const meta = motionMeta();
    const k = motionK();
    const endReady = !!(meta && k && meta.clips['walk-end'] && actions['walk-end']);
    const endDist = endReady ? meta.clips['walk-end'].total * k : 0;
    let step = 0;
    if (pmPhase === 'start' || pmPhase === 'end') {
      const pn = pmPhase === 'start' ? 'walk-start' : 'walk-end';
      const cm = meta.clips[pn];
      const a = actions[pn];
      a.timeScale = align;
      const t = Math.min(a.time, cm.dur);
      step = Math.max(0, motionCurveAt(cm, t) - motionCurveAt(cm, pmPhaseT)) * k;
      pmPhaseT = t;
      pmSpeed = dt > 0 ? step / dt : 0;
      if (pmPhase === 'start' && t >= cm.settle - 0.05) {
        // the take ran out of road: hand off to the loop at matched speed
        // (tight fade — long crossfades between gaits read as skating)
        pmPhase = 'loop';
        pmLoopT = 0;
        playBase(pmLoopName, 0.15,
          Math.max(0.0001, pmSpeed / clipCruise(pmLoopName)));
      }
    } else {
      // too close for the stopping take (short leg): fall back to the brake
      const brakeNeeded = pmPath.length === 1 && (!endReady || dist < endDist * 0.45);
      const wantSpeed = tune.walk * align *
        (brakeNeeded ? clamp(dist / 0.55, 0.3, 1) : 1);
      pmSpeed += clamp(wantSpeed - pmSpeed, -3.5 * dt, 2.0 * dt);
      const la = actions[pmLoopName];
      const cm = meta && meta.clips && meta.clips[pmLoopName];
      if (la) la.timeScale = Math.max(0.0001, pmSpeed / clipCruise(pmLoopName));
      // r20.3 (James's gait lecture: "plant, pull, plant, pull — never
      // gliding evenly"): the ground follows the loop's measured PLANTED-FOOT
      // travel curve, so his speed pulses with the stride exactly like the
      // clip's feet do — the planted foot stays nailed by construction.
      // r20.1's squish was the RAW curve's 60Hz measurement noise; the curve
      // is now smoothed (±3 frames) + monotonic at load (see motionMeta).
      // timeScale stays the tempo COMMAND; the curve owns the distance.
      if (la && cm && k) {
        const t = la.time % cm.dur;
        let dfw = motionCurveAt(cm, t) - motionCurveAt(cm, pmLoopT);
        if (dfw < 0) dfw += cm.total;   // loop wrap (curve is monotonic)
        step = Math.max(0, dfw) * k;
        pmLoopT = t;
      } else {
        step = pmSpeed * dt;
      }
    }
    // the stopping take fires when the last leg's remaining distance equals
    // its measured travel — from cruise or mid-step-out alike
    if (endReady && pmPhase !== 'end' && pmPath.length === 1
        && dist <= endDist && dist >= endDist * 0.45) {
      pmPhase = 'end';
      const cm = meta.clips['walk-end'];
      pmPhaseT = Math.max(0, (cm.lead || 0) - 0.05);
      playPhaseClip('walk-end', 0.15, pmPhaseT);
    }
    // ---- move: THE FOOT ANCHOR (r21, James's law: "planted = frozen, a
    // fail if it even slightly moves"). While the clip has a foot planted,
    // the body's position is DERIVED from that foot's world anchor
    // (group = anchor − clip-foot offset), so the planted foot cannot move
    // — gait-sim measures 0.0mm drift on the walk loop. Turning while
    // anchored pivots the body AROUND the planted foot. Fallback when a
    // clip has no foot data: the r20.3 curve step along the path line.
    const an = pmPhase === 'start' ? 'walk-start'
      : pmPhase === 'end' ? 'walk-end' : pmLoopName;
    const acm = meta && meta.clips ? meta.clips[an] : null;
    const aact = actions[an];
    let anchored = false;
    if (aact && acm && acm.feetL && acm.cphi !== undefined && k) {
      const tt = pmPhase === 'loop' ? (aact.time % acm.dur) : Math.min(aact.time, acm.dur);
      const ff = tt * acm.fps;   // float — see pmFootAt
      // r21.3 HYSTERESIS (the gait meter caught the lock flickering at
      // age≈0.05s — the ankle heel-rolls across a single threshold all
      // stance long, so compensation never accumulated): a foot ACQUIRES
      // low (3cm over its floor) but the held lock RELEASES only when the
      // foot clearly lifts (6.5cm).
      const zL = pmFootAt(acm, 'L', ff)[2] - acm.zMinL;
      const zR = pmFootAt(acm, 'R', ff)[2] - acm.zMinR;
      const heldL = pmLock && pmLock.clip === an && pmLock.foot === 'L';
      const heldR = pmLock && pmLock.clip === an && pmLock.foot === 'R';
      const pL = zL < (heldL ? 0.065 : 0.03);
      const pR = zR < (heldR ? 0.065 : 0.03);
      if (pmLock && (pmLock.clip !== an
          || (pmLock.foot === 'L' && !pL) || (pmLock.foot === 'R' && !pR))) pmLock = null;
      if (!pmLock && (pL || pR)) {
        // r21.5: a candidate foot must be WEIGHT-BEARING before it can be
        // the anchor — sweeping backward under the body at ≥35% of the
        // clip's mean pace. Locking a foot that is still finishing its
        // landing snatches its leftover forward motion into the body
        // (the plant-jerk James called out; the smoothing detour is above).
        const beltPerFrame = (acm.total / acm.dur) * k / acm.fps;
        const bearing = (f) => {
          if (ff < 1) return false;
          const o1 = pmFootOffset(acm, f, ff, k);
          const o0 = pmFootOffset(acm, f, ff - 1, k);
          const v = (o1[0] - o0[0]) * Math.sin(pmYaw)
            + (o1[1] - o0[1]) * Math.cos(pmYaw);
          return v < -0.35 * beltPerFrame;
        };
        const bL = pL && bearing('L'), bR = pR && bearing('R');
        if (bL || bR) {
          let foot = bL ? 'L' : 'R';
          if (bL && bR) {   // both bearing: take the slower (truer stance)
            const sp = (f) => {
              const a1 = pmFootAt(acm, f, ff), a0 = pmFootAt(acm, f, ff - 1);
              return Math.hypot(a1[0] - a0[0], a1[1] - a0[1]);
            };
            foot = sp('L') <= sp('R') ? 'L' : 'R';
          }
          const off = pmFootOffset(acm, foot, ff, k);
          pmLock = { clip: an, foot,
            x: pmGroup.position.x + off[0], z: pmGroup.position.z + off[1] };
        }
      }
      if (pmLock) {
        // hard lock, no smoothing — the r21.4 velocity limiter REVERTED
        // (James: "much more glidey... it was definitely better before").
        // Its velocity memory read the engagement frame as "brake to zero"
        // and dragged the whole body at every footfall.
        const off = pmFootOffset(acm, pmLock.foot, ff, k);
        pmGroup.position.x = pmLock.x - off[0];
        pmGroup.position.z = pmLock.z - off[1];
        anchored = true;
        pmLock.age = (pmLock.age || 0) + dt;
      }
    }
    if (!anchored && dist > 1e-4) {
      const mv = Math.min(step, dist);
      pmGroup.position.x += (dx / dist) * mv;
      pmGroup.position.z += (dz / dist) * mv;
    }
    // ---- arrive. Anchored walking is a pursuit: he steers at the node
    // rather than sliding along its exact line, so "reached" needs slack
    // (turn radius ~0.2m at cruise), and passing the closest approach must
    // advance the path or he'd orbit the node forever.
    const dxa = next.x - pmGroup.position.x;
    const dza = next.z - pmGroup.position.z;
    const dista = Math.hypot(dxa, dza);
    if (dista < pmLegMin) pmLegMin = dista;
    const lastLeg = pmPath.length === 1;
    const reach = pmPhase === 'end' ? 0.02
      : anchored ? (lastLeg ? 0.07 : 0.24)
        : Math.max(step * 1.5, 0.015);
    const passed = anchored && pmPhase !== 'end'
      && pmLegMin < 0.5 && dista > pmLegMin + 0.25;
    if (pmPhase === 'end') {
      const cmE = meta.clips['walk-end'];
      if (pmPhaseT >= cmE.settle - 0.03 || dista < reach) {
        // planted. The take's settle tail keeps playing as his first idle
        // beat — pmTick fades it to a real idle when it runs out (below).
        pmGroup.position.set(next.x, 0, next.z);
        pmLock = null;
        pmPath.shift();
        pmPhase = 'loop';
        pmSpeed = 0;
        pmState = 'station';
        const st = PM_STATIONS[pmStationKey];
        if (st) pmFaceTarget = st.face;
        const cb = pmArrived;
        pmArrived = null;
        if (cb) cb();
      }
    } else if (dista <= reach || passed) {
      pmLegMin = Infinity;
      if (!pmPath.length || pmPath.length === 1) {
        // final node: settle exactly on station (small nudge, lock released)
        pmGroup.position.set(next.x, 0, next.z);
        pmLock = null;
      }
      pmPath.shift();
      if (!pmPath.length) {
        pmState = 'station';
        pmPhase = 'loop';
        pmSpeed = 0;
        const st = PM_STATIONS[pmStationKey];
        if (st) pmFaceTarget = st.face;
        playBase(pickIdle());
        const cb = pmArrived;
        pmArrived = null;
        if (cb) cb();
      }
    }
  } else if (pmState !== 'walking') {
    // settle toward the station's facing (or the visitor, briefly, when poked)
    let want = pmFaceTarget;
    if (pmFaceCamera > 0) {
      pmFaceCamera -= dt;
      want = Math.atan2(camera.position.x - pmGroup.position.x, camera.position.z - pmGroup.position.z);
    }
    let dYaw = want - pmYaw;
    while (dYaw > Math.PI) dYaw -= Math.PI * 2;
    while (dYaw < -Math.PI) dYaw += Math.PI * 2;
    // slower settle (r20.2): a planted-feet pivot can't NOT slide without a
    // turn take — at least make it read deliberate instead of ice-spin
    pmYaw += dYaw * Math.min(1, dt * 2.2);
  }
  // the stopping take's settle tail hands off to a real idle when it ends
  if (pmState === 'station' && !oneshotAction && actions['walk-end']
      && baseAction === actions['walk-end']) {
    const em = motionMeta();
    const cm = em && em.clips['walk-end'];
    if (!cm || baseAction.time >= cm.dur - 0.05) playBase(pickIdle(), 0.4);
  }
  pmGroup.rotation.y = pmYaw;

  if (pmState === 'station' && now >= pmNextAt) {
    pmNextAt = Infinity;
    pmRoutine();
  }

  // carried things ride the right hand — centered past the FINGERS, not the
  // wrist (the r16 "paper bracelet"), and pitched with the arm swing so the
  // letter tilts as the hand does instead of slicing the forearm
  if (pmCarried && handBone) {
    handBone.getWorldPosition(CARRY_W);
    if (midBone) {
      midBone.getWorldPosition(CARRY_V);
      CARRY_DIR.subVectors(CARRY_V, CARRY_W).normalize();
      pmCarried.position.copy(CARRY_V).addScaledVector(CARRY_DIR, 0.06);
      pmCarried.position.y += 0.015;
      pmCarried.rotation.set(-0.35 + CARRY_DIR.y * 1.1, pmYaw, 0.2);
    } else {
      pmCarried.position.copy(CARRY_W);
      pmCarried.position.y += 0.02;
      pmCarried.rotation.set(-0.4, pmYaw, 0.2);
    }
  }

  // envelope flights
  for (let i = flights.length - 1; i >= 0; i--) {
    const f = flights[i];
    f.t += dt / f.dur;
    if (f.t >= 1) {
      if (f.keep) f.mesh.position.copy(f.target);
      else scene.remove(f.mesh);
      flights.splice(i, 1);
      if (f.onLand) f.onLand();
      continue;
    }
    const e = f.t * f.t * (3 - 2 * f.t);
    f.mesh.position.lerpVectors(f.from, f.target, e);
    f.mesh.position.y += Math.sin(f.t * Math.PI) * f.arc;
    f.mesh.rotation.x += dt * 6;
  }
}
let pmFaceTarget = Math.PI;

/* ================= speech ================= */

const shiftStart = Date.now();
let ambientPool = [];
let clickPool = [];
let bubbleTimer = 0;
let nextAmbientAt = performance.now() + 9000 + Math.random() * 6000;
let bubbleUntil = 0;

function drawLine(pool, source) {
  if (pool.length === 0) {
    pool.push(...source);
    for (let i = pool.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
  }
  return pool.pop();
}

function speak(line) {
  // Speech bubbles RETIRED 2026-08-08 (James: "get rid of those and they won't
  // be coming back") — the voice is the only channel now. Lines without a
  // recorded take go unspoken until their ElevenLabs bake lands; the line pools
  // stay as the recording script.
  const vf = VOICE_LINES[line];
  if (vf) pmSay(vf);
}

/* ================= the voice (r17; r18 batch 2026-08-10) =================
   Thirteen ElevenLabs takes in assets/speech-clips/, every one viseme-baked.
   Short lines ride their pool triggers (VOICE_LINES maps line text -> file);
   monologues fire on their own slow clock when the visitor is standing near
   him (none on file since the TTS-era takes retired — see PM_MONOLOGUE_SCRIPT).
   Mouth: V_Open + Jaw_Open driven by live audio amplitude (analyser) on the
   body AND the conforming beard pieces (same morph names — the whiskers must
   ride the jaw or they float). ElevenLabs later = same filenames, new mp3s. */

const VOICE_LINES = {
  "You want the blue ink. Everyone wants the blue ink.": 'blue-ink',
  "I'm on break. I've been on break since '91.": 'on-break-since-91',
  "The donuts are from a Tuesday.": 'donuts',
  "This one goes under R, for regret.": 'r-for-regret',
  "This one's addressed to a lake. See my problem?": 'addressed-to-a-lake',
  "Can I help you? No. But ask anyway.": 'can-i-help-you',
  "The pot is from '79. Possibly the coffee too.": 'pot-from-79',
  "Got one last month that was mailed from Duluth to Duluth. Took eleven years. So it saw a little of the country.": 'duluth',
  "You'd be surprised how many people forget what state their mother lives in. Course, sometimes that's deliberate.": 'forget-mothers-state',
  "People complain the Postal Service is slow. Generally those people have never tried finding a man named Earl with no last name.": 'man-named-earl',
  "Some people put 'URGENT' on the envelope. That's helpful. Gives us an idea how disappointed they'll be.": 'urgent',
  "My supervisor says I ought to clear some of this out. I told him I've only been here fifty years and I don't like making snap decisions.": 'no-snap-decisions',
  "You can tell a love letter without opening it. Too much postage and absolutely no planning.": 'love-letter',
};
// The two r17 monologue takes were AccuLips-TTS era; James deleted their mp3s
// with the 2026-08-10 ElevenLabs re-record. The texts stay here as the
// recording script — re-enable an entry when its new take + viseme bake land.
const PM_MONOLOGUES = [];
const PM_MONOLOGUE_SCRIPT = [
  {
    file: 'dead-letter-isnt-a-failure',
    text: "People think a dead letter is a failure. It isn't — it's a promise that ran out of road, and somebody's got to hold the end of it. Every envelope down here got licked shut by a person who believed, for at least one minute, that the world was listening. My job is to be the world, a little late.",
  },
  {
    file: 'long-speech-deepthoughts',
    text: "Every letter here was written by someone who believed in an address. That's the whole faith of the thing - you fold up a piece of yourself, you name a place in the world where you think a person is standing, and you let go of it. Most of the time the world obliges. But down here we keep the ones where it didn't: the street that got renamed, the apartment that emptied out, the name spelled the way it sounded rather than the way it was. People assume this is a room full of failure. It isn't. It's a room full of intention that outlived its target - which, if you think about it, is most of what any of us leave behind. I don't open them to be nosy. I open them because a letter unread is a question still hanging in the air, and somebody ought to be the one who hears it, even if he's not the one it was meant for.",
  },
];

const VOICE_LEVEL = 0.9;
let voiceVol = 1.0;
let voiceMouth = 0;
let voiceStem = null;        // current speech-clip stem — keys into DLO_VISEMES
let lastVis = null;          // last applied viseme entry, for cleanup on end
const JAW_Q = new THREE.Quaternion();
let monologueActive = false;
let monologueIdx = Math.floor(Math.random() * PM_MONOLOGUES.length);
let nextMonologueAt = performance.now() + 90000 + Math.random() * 45000;
let voiceCtx = null, voiceAnalyser = null, voiceData = null;
const pmMouthMeshes = [];   // { mesh, iOpen, iJaw } — filled at model load

const voiceAudio = new Audio();
voiceAudio.preload = 'auto';
voiceAudio.addEventListener('ended', () => {
  // talk take back to an idle when a plain line finishes (monologues restore
  // through their own onended; never cut a gesture mid-flight)
  if (monologueActive || pmStillOn) return;
  if (baseAction === actions.talk && pmState === 'station' && !oneshotAction) {
    playBase(pickIdle(), 0.45);
  }
});

function voiceBusy() { return !!voiceAudio.src && !voiceAudio.paused && !voiceAudio.ended; }

function voiceFalloff() {
  if (!pmModel) return 1;
  const d = pos.distanceTo(pmGroup.position);
  return clamp(1 - (d - 2.0) / 12, 0.25, 1);
}

function pmSay(file, force) {
  if (!soundOn) return false;
  if (voiceBusy()) {
    if (!force) return false;
    voiceAudio.pause();   // QA stand: a new click always wins
  }
  if (!voiceCtx) {
    try {
      voiceCtx = new (window.AudioContext || window.webkitAudioContext)();
      const src = voiceCtx.createMediaElementSource(voiceAudio);
      voiceAnalyser = voiceCtx.createAnalyser();
      voiceAnalyser.fftSize = 512;
      voiceData = new Uint8Array(voiceAnalyser.fftSize);
      src.connect(voiceAnalyser);
      voiceAnalyser.connect(voiceCtx.destination);
    } catch (e) { voiceCtx = null; /* mouth falls back to silence-driven rest */ }
  }
  if (voiceCtx && voiceCtx.state === 'suspended') voiceCtx.resume();
  voiceStem = file;
  voiceAudio.src = `assets/speech-clips/${file}.mp3`;
  voiceAudio.volume = clamp(soundVol * voiceVol * VOICE_LEVEL * voiceFalloff(), 0, 1);
  voiceAudio.currentTime = 0;
  voiceAudio.onended = null;
  const p = voiceAudio.play();
  if (p) p.catch(() => {});
  // r20: he gestures with the voice — the talk take runs under any spoken
  // line while he's standing at a station. Museum-freeze keeps its held
  // pose, walking keeps its gait, monologues manage talk themselves.
  if (actions.talk && !pmStillOn && pmState === 'station' && !oneshotAction) {
    playBase('talk', 0.35);
  }
  return true;
}

function setMouth(v) {
  for (const m of pmMouthMeshes) {
    // Merged_Open_Mouth carries the visible open (3.5cm at 1.0 — V_Open alone
    // is a 1cm whisper buried under the mustache, the 08-08 frozen-lips bug)
    if (m.iMerged !== undefined) m.mesh.morphTargetInfluences[m.iMerged] = Math.min(1, v * 0.9);
    if (m.iOpen !== undefined) m.mesh.morphTargetInfluences[m.iOpen] = v * 0.25;
    if (m.iJaw !== undefined) m.mesh.morphTargetInfluences[m.iJaw] = v * 0.3;
  }
}

function voiceTick(dt) {
  if (voiceBusy()) {
    voiceAudio.volume = clamp(soundVol * voiceVol * VOICE_LEVEL * voiceFalloff(), 0, 1);
    // authored AccuLips visemes when the line has them — the real mouth.
    // The amplitude flap below is only the fallback for unbaked lines.
    const vis = (globalThis.DLO_VISEMES || {})[voiceStem];
    if (vis) {
      // lead the reported currentTime: decoder + output latency put the sound
      // in your ears later than the property claims. lipSync tuner = by-ear trim.
      const lead = (voiceCtx && voiceCtx.outputLatency || 0.04) + tune.lipSync;
      applyVisemes(vis, voiceAudio.currentTime + lead);
      lastVis = vis;
      voiceMouth = 0;
      return;
    }
    let target = 0;
    if (voiceAnalyser) {
      voiceAnalyser.getByteTimeDomainData(voiceData);
      let sum = 0;
      for (let i = 0; i < voiceData.length; i++) {
        const x = (voiceData[i] - 128) / 128;
        sum += x * x;
      }
      // normalize by element volume — the analyser sits downstream of it, so
      // distance falloff would otherwise shut his lips (found 2026-08-08)
      const rms = Math.sqrt(sum / voiceData.length) / Math.max(0.15, voiceAudio.volume);
      target = clamp((rms - 0.03) * 7, 0, 1);
    } else {
      target = 0.3 + 0.25 * Math.sin(performance.now() * 0.02);   // no-analyser babble
    }
    voiceMouth += (target - voiceMouth) * Math.min(1, dt * 14);
  } else {
    if (lastVis) { clearVisemes(lastVis); lastVis = null; }
    // refresh the jaw base while he is silent — the clip owns the bone here
    if (jawBone) { jawBaseQ.copy(jawBone.quaternion); jawBaseValid = true; }
    voiceMouth += (0 - voiceMouth) * Math.min(1, dt * 8);
  }
  if (voiceMouth > 0.001 || voiceBusy()) setMouth(voiceMouth);
}

function applyVisemes(vis, t) {
  const x = clamp(t * vis.fps, 0, vis.n - 1.001);
  const i = Math.floor(x), f = x - i;
  for (const name in vis.tracks) {
    const arr = vis.tracks[name];
    const j = Math.min(i + 1, arr.length - 1);
    const v = Math.min(1, (arr[i] + (arr[j] - arr[i]) * f) * tune.lipPunch);
    for (const m of pmMouthMeshes) {
      const idx = m.mesh.morphTargetDictionary[name];
      if (idx !== undefined) m.mesh.morphTargetInfluences[idx] = v;
    }
  }
  if (vis.jaw && vis.jaw.length && jawBone && jawBaseValid) {
    const j = Math.min(i + 1, vis.jaw.length - 1);
    const a = vis.jaw[i] + (vis.jaw[j] - vis.jaw[i]) * f;
    // ABSOLUTE, not multiply: base pose captured while silent × viseme delta.
    // A bare multiply compounds when a near-frozen clip stops rewriting the
    // bone — the swallowed-jaw demon of 2026-08-08.
    jawBone.quaternion.copy(jawBaseQ).multiply(JAW_Q.setFromAxisAngle(AXIS_Z, a));
  }
}

function clearVisemes(vis) {
  for (const name in vis.tracks) {
    for (const m of pmMouthMeshes) {
      const idx = m.mesh.morphTargetDictionary[name];
      if (idx !== undefined) m.mesh.morphTargetInfluences[idx] = 0;
    }
  }
}

function endMonologue() {
  if (!monologueActive) return;
  monologueActive = false;
  if (pmState === 'busy') pmState = 'station';
  if (mixer) playBase(pickIdle());
}

function voiceMonologueTick(now) {
  if (!PM_MONOLOGUES.length) return;   // no recorded takes on file right now
  if (now < nextMonologueAt || monologueActive) return;
  if (!pmModel || pmAway || letterOpen || pmStillOn || !soundOn) return;
  if (pmState !== 'station' || voiceBusy()) return;
  if (pos.distanceTo(pmGroup.position) > 4.5) return;   // needs an audience
  const mono = PM_MONOLOGUES[monologueIdx % PM_MONOLOGUES.length];
  monologueIdx += 1;
  if (!pmSay(mono.file)) { nextMonologueAt = now + 30000; return; }
  monologueActive = true;
  pmFaceCamera = 8;
  pmState = 'busy';
  if (actions.talk) playBase('talk', 0.4);
  voiceAudio.onended = endMonologue;
  nextMonologueAt = now + 240000 + Math.random() * 180000;
}

const bubbleV = new THREE.Vector3();
function bubbleTick() {
  if (bubbleEl.hidden || !headBone) return;
  headBone.getWorldPosition(bubbleV);
  bubbleV.y += 0.34;
  bubbleV.project(camera);
  if (bubbleV.z > 1 || bubbleV.z < -1) { bubbleEl.style.opacity = '0'; return; }
  bubbleEl.style.opacity = '1';
  const sx = (bubbleV.x * 0.5 + 0.5) * innerWidth;
  const sy = (-bubbleV.y * 0.5 + 0.5) * innerHeight;
  bubbleEl.style.left = `${clamp(sx, 150, innerWidth - 60)}px`;
  bubbleEl.style.top = `${clamp(sy, 90, innerHeight - 40)}px`;
}

function ambientTick(now) {
  if (now < nextAmbientAt) return;
  if (letterOpen || pmAway || voiceBusy()) { nextAmbientAt = now + 8000; return; }
  const line = drawLine(ambientPool, PM_AMBIENT);
  speak(line);
  if (PM_SIGH_LINES.has(line) && pmState === 'station' && !reducedMotion) {
    pmState = 'busy';
    playOneshot('sigh', () => { pmState = 'station'; });
  }
  nextAmbientAt = now + 24000 + Math.random() * 22000;
}

let punchFlash = 0;
function shiftTick() {
  const elapsed = Math.floor((Date.now() - shiftStart) / 1000);
  const minutes = Math.floor(elapsed / 60);
  const seconds = String(elapsed % 60).padStart(2, '0');
  drawPunch(`${minutes}:${seconds}`);
  texPunch.needsUpdate = true;

  const due = PM_SHIFT_LINES.find((entry) => !entry.said && elapsed >= entry.at);
  if (due && !letterOpen && !pmAway) {
    due.said = true;
    speak(due.line);
    nextAmbientAt = performance.now() + 26000;
  }
}

// viseme-baked lines only while testing (the full 2026-08-10 batch)
const QA_ROTATION = ['r-for-regret', 'blue-ink', 'addressed-to-a-lake',
  'can-i-help-you', 'donuts', 'duluth', 'pot-from-79', 'forget-mothers-state',
  'man-named-earl', 'urgent', 'no-snap-decisions', 'love-letter',
  'on-break-since-91'];
let qaIdx = 0;

function postmasterClicked() {
  if (pmAway) return;   // he is upstairs; the click hits nothing that answers
  if (pmStillOn) {
    // frozen = the QA stand: every click answers, rotating the recorded takes,
    // no cooldowns, interrupting mid-line — James testing the mouth
    pmSay(QA_ROTATION[qaIdx++ % QA_ROTATION.length], true);
    return;
  }
  speak(drawLine(clickPool, PM_CLICKED));
  nextAmbientAt = performance.now() + 26000;
  pmFaceCamera = 5;
  if (pmState === 'station' && !reducedMotion) {
    pmState = 'busy';
    const clip = ['wave', 'bow', 'wag-no'][Math.floor(Math.random() * 3)];
    playOneshot(clip, () => { pmState = 'station'; });
  }
}

/* ================= the mail ================= */

const MAX_FALLING = 4;
const BASKET_POS = new THREE.Vector3(-4.5, 0, -1.5);
const CHUTE_Y = ROOM.h - 0.35;

// ---- the pile (2026-07-22): letters genuinely accumulate, bottom first ----
// The basket is a see-through wire cage, so the pile is real geometry: filled
// layer by layer from the basket floor, mounding above the rim, then spilling
// onto the floor around it. Every resident is clickable (2026-08-10, James:
// he could see letters through the cage but not open them) — opening reads
// without removing, so buried letters are safe to serve.
// EULER LESSON (2026-08-10): with the default XYZ order and x=-PI/2, the
// in-plane "spin" of a flat-lying letter goes in the Z slot; a random Y here
// TILTS the letter (up to fully vertical) — that was why letters stood on
// edge in the basket and dug diagonally into the floor.
const PILE = {
  baseY: 0.1,
  layerH: 0.036,
  layers: [],        // per-layer resident groups
  resident: 0,
};
const PILE_CAP = 250;      // beyond this the buried bottom quietly recycles
const STRAY_CAP = 30;
function pileRimLayer() { return Math.max(3, Math.floor((basketRimY - 0.18 - PILE.baseY) / PILE.layerH)); }
function pileRadius(layerIdx) {
  const rim = pileRimLayer();
  if (layerIdx <= rim) {
    // the cage tapers: narrow floor, wide rim
    return 0.34 + 0.24 * (layerIdx / rim);
  }
  return Math.max(0.16, 0.5 - 0.06 * (layerIdx - rim));   // the mound above
}
function pileLayerCap(layerIdx) {
  const r = pileRadius(layerIdx);
  return Math.max(3, Math.round((r / 0.58) * (r / 0.58) * 14));
}
function pileTopLayer() {
  for (let i = PILE.layers.length - 1; i >= 0; i--) {
    if (PILE.layers[i].length) return i;
  }
  return -1;
}
function pileTopY() {
  return PILE.baseY + (pileTopLayer() + 1) * PILE.layerH;
}
function placeInPile(group) {
  let L = pileTopLayer();
  if (L < 0) L = 0;
  if (PILE.layers[L] && PILE.layers[L].length >= pileLayerCap(L)) L += 1;
  while (PILE.layers.length <= L) PILE.layers.push([]);
  const r = Math.sqrt(Math.random()) * pileRadius(L);
  const a = Math.random() * Math.PI * 2;
  group.position.set(
    BASKET_POS.x + Math.cos(a) * r,
    PILE.baseY + L * PILE.layerH,
    BASKET_POS.z + Math.sin(a) * r * 0.85);
  // lie flat with a random in-plane spin (Z slot — see the euler lesson
  // above); small X/Y jitter = the gentle unevenness of settled paper
  group.rotation.set(-Math.PI / 2 + (Math.random() - 0.5) * 0.14,
    (Math.random() - 0.5) * 0.1, Math.random() * Math.PI * 2);
  group.userData.pileLayer = L;
  PILE.layers[L].push(group);
  PILE.resident += 1;
  basketPile.push(group);
  // settled letters are static: freeze the matrix so hundreds of pile residents
  // stop recomposing transforms every frame (r3 perf pass)
  group.updateMatrix();
  group.matrixAutoUpdate = false;
  if (PILE.resident > PILE_CAP) {
    // recycle from the FULLEST buried layer, not the bottom-up (the old
    // bottom-first shift slowly hollowed out the base over a long session —
    // visible through the wire cage; James caught it 2026-08-10)
    const top = pileTopLayer();
    let best = -1;
    for (let li = 0; li < PILE.layers.length; li++) {
      if (li === top || !PILE.layers[li].length) continue;
      if (best === -1 || PILE.layers[li].length > PILE.layers[best].length) best = li;
    }
    if (best !== -1) removeEnvelopeGroup(PILE.layers[best].shift());
  }
}
// spill chance grows as the mound rises past the rim
function spillChance() {
  const over = pileTopLayer() - pileRimLayer();
  if (over < 0) return 0;
  return clamp(0.25 + over * 0.18, 0.25, 0.85);
}

let deck = [];
function drawFromDeck() {
  if (deck.length === 0) {
    deck = LETTERS.map((_, i) => i);
    for (let i = deck.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
  }
  return deck.pop();
}

// envelope face drawn per letter, cached
const envelopeTexCache = new Map();
function envelopeTexture(letterIndex) {
  if (envelopeTexCache.has(letterIndex)) return envelopeTexCache.get(letterIndex);
  const letter = LETTERS[letterIndex];
  const c = document.createElement('canvas');
  c.width = 256; c.height = 160;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 30, 160);
  grad.addColorStop(0, '#ded4b4');
  grad.addColorStop(0.55, '#cfc5a4');
  grad.addColorStop(1, '#b4aa8a');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 160);
  g.strokeStyle = 'rgba(30,26,18,0.55)';
  g.lineWidth = 2;
  g.strokeRect(1, 1, 254, 158);
  // flap creases
  g.strokeStyle = 'rgba(0,0,0,0.16)';
  g.beginPath(); g.moveTo(0, 0); g.lineTo(128, 74); g.lineTo(256, 0); g.stroke();
  // addressee
  g.fillStyle = '#2a2419';
  g.font = '700 15px "Courier New", monospace';
  const lines = letter.to.split('\n');
  lines.slice(0, 3).forEach((ln, i) => g.fillText(ln.slice(0, 26), 24, 92 + i * 20));
  // stamp + cancellation
  g.fillStyle = '#75987f';
  g.fillRect(206, 12, 34, 40);
  g.strokeStyle = 'rgba(244,240,226,0.55)'; g.lineWidth = 3;
  g.strokeRect(209, 15, 28, 34);
  g.strokeStyle = 'rgba(158,58,44,0.4)'; g.lineWidth = 2;
  g.beginPath(); g.arc(198, 32, 22, 0, Math.PI * 2); g.stroke();
  for (let i = 0; i < 3; i++) {
    g.beginPath(); g.moveTo(160, 24 + i * 8); g.lineTo(216, 24 + i * 8); g.stroke();
  }
  if (letter.portal) {
    // airmail edge striping: this envelope goes somewhere
    for (const y of [0, 152]) {
      for (let x = 0; x < 256; x += 16) {
        g.fillStyle = '#a03c2e'; g.fillRect(x, y, 8, 8);
        g.fillStyle = '#2b4a86'; g.fillRect(x + 8, y, 8, 8);
      }
    }
    // the return address, in blue ink
    g.fillStyle = '#2b4a86';
    g.font = '700 11px "Courier New", monospace';
    letter.from.split('\n').slice(0, 2).forEach((ln, i) => g.fillText(ln.slice(0, 28), 14, 18 + i * 13));
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = maxAniso;
  envelopeTexCache.set(letterIndex, t);
  return t;
}

const ENV_W = 0.34, ENV_H = 0.2125;
// one shared geometry + one cached material per letter (r3 perf pass — a fresh
// geometry and Standard material per envelope was pure waste at pile scale)
const ENV_GEO = new THREE.PlaneGeometry(ENV_W, ENV_H);
const ENV_BACK_MAT = new THREE.MeshLambertMaterial({ color: 0xcfc5a4 });
const envFrontMats = new Map();
function envFrontMat(letterIndex) {
  if (!envFrontMats.has(letterIndex)) {
    envFrontMats.set(letterIndex,
      new THREE.MeshLambertMaterial({ map: envelopeTexture(letterIndex) }));
  }
  return envFrontMats.get(letterIndex);
}
function envelopeMesh(letterIndex, registerClick = true) {
  const group = new THREE.Group();
  const front = new THREE.Mesh(ENV_GEO, envFrontMat(letterIndex));
  const back = new THREE.Mesh(ENV_GEO, ENV_BACK_MAT);
  back.rotation.y = Math.PI;
  back.position.z = -0.002;
  group.add(front, back);
  group.userData.letterIndex = letterIndex;
  if (registerClick) {
    envClickables.push(front, back);
    front.userData.envelope = group;
    back.userData.envelope = group;
    hoverDirty = true;
  }
  return group;
}

const ENV_PAD_GEO = new THREE.PlaneGeometry(ENV_W * 2, ENV_H * 2);
const ENV_PAD_MAT = new THREE.MeshBasicMaterial({
  transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide,
});
function dropHitPad(group) {
  const pad = group.userData.hitPad;
  if (!pad) return;
  group.remove(pad);
  const i = envClickables.indexOf(pad);
  if (i !== -1) envClickables.splice(i, 1);
  delete group.userData.hitPad;
  hoverDirty = true;
}

const falling = [];        // { group, vy, sway, phase, target }
const basketPile = [];     // resting envelope groups in the basket
const floorStrays = [];    // resting envelope groups on the floor
const envClickables = [];
let nextSpawnAt = 0;
let guaranteedAirmail = true;

function spawnEnvelope(startMidAir) {
  if (falling.length >= MAX_FALLING) return;
  let idx;
  if (guaranteedAirmail) {
    guaranteedAirmail = false;
    const portals = LETTERS.flatMap((l, i) => (l.portal ? [i] : []));
    idx = portals[Math.floor(Math.random() * portals.length)];
    deck = deck.filter((d) => d !== idx);
  } else {
    idx = drawFromDeck();
  }
  const group = envelopeMesh(idx);
  // falling letters get a fat invisible hit pad (2× the paper): they sway,
  // spin, and now fall at 0.7 — the bare envelope was nearly unclickable
  // (James, 2026-08-10). Removed again on settle so pile picking stays exact.
  const pad = new THREE.Mesh(ENV_PAD_GEO, ENV_PAD_MAT);
  pad.userData.envelope = group;
  group.add(pad);
  group.userData.hitPad = pad;
  envClickables.push(pad);
  const y = startMidAir ? 1.4 + Math.random() * 2.2 : CHUTE_Y;
  group.position.set(
    BASKET_POS.x + (Math.random() - 0.5) * 0.7,
    y,
    BASKET_POS.z + (Math.random() - 0.5) * 0.5);
  group.rotation.set((Math.random() - 0.5) * 0.6, Math.random() * Math.PI * 2, 0);
  scene.add(group);
  falling.push({
    group,
    sway: 0.5 + Math.random() * 0.7,
    phase: Math.random() * Math.PI * 2,
    speed: 0.75 + Math.random() * 0.5,
    target: new THREE.Vector3(
      BASKET_POS.x + (Math.random() - 0.5) * 0.5,
      pileTopY() + 0.05,
      BASKET_POS.z + (Math.random() - 0.5) * 0.4),
  });
}

function settleIntoBasket(f) {
  const i = falling.indexOf(f);
  if (i !== -1) falling.splice(i, 1);
  dropHitPad(f.group);
  bumpDeadLetters();
  playFlutter(0.35);
  if (Math.random() < spillChance()) {
    // the mound is past the rim: this one slides off onto the floor
    const a = Math.random() * Math.PI * 2;
    const target = new THREE.Vector3(
      BASKET_POS.x + Math.cos(a) * (0.9 + Math.random() * 0.6),
      0.015,
      BASKET_POS.z + Math.sin(a) * (0.75 + Math.random() * 0.55));
    slideEnvelope(f.group, target, () => {
      // flat on the cement, spin in the Z slot — NEVER a Y spin here (it
      // tilts the letter into the floor; see the euler lesson at PILE)
      f.group.rotation.set(-Math.PI / 2, 0, Math.random() * Math.PI * 2);
      f.group.updateMatrix();
      f.group.matrixAutoUpdate = false;
      floorStrays.push(f.group);
      while (floorStrays.length > STRAY_CAP) removeEnvelopeGroup(floorStrays[0]);
    });
    return;
  }
  placeInPile(f.group);
}

function removeEnvelopeGroup(group) {
  scene.remove(group);
  for (const child of group.children) {
    const ei = envClickables.indexOf(child);
    if (ei !== -1) envClickables.splice(ei, 1);
  }
  hoverDirty = true;
  const L = group.userData.pileLayer;
  if (L !== undefined && PILE.layers[L]) {
    const pi = PILE.layers[L].indexOf(group);
    if (pi !== -1) { PILE.layers[L].splice(pi, 1); PILE.resident -= 1; }
    delete group.userData.pileLayer;
  }
  for (const list of [basketPile, floorStrays]) {
    const i = list.indexOf(group);
    if (i !== -1) list.splice(i, 1);
  }
  const fi = falling.findIndex((f) => f.group === group);
  if (fi !== -1) falling.splice(fi, 1);
}

// the postmaster takes one for his rounds: a floor stray first, else off the top
function takeBasketEnvelope() {
  if (floorStrays.length) {
    const group = floorStrays[floorStrays.length - 1];
    removeEnvelopeGroup(group);
    return group;
  }
  const L = pileTopLayer();
  if (L < 0) return null;
  const layer = PILE.layers[L];
  const group = layer[layer.length - 1];
  removeEnvelopeGroup(group);
  return group;
}

function mailTick(dt, now) {
  if (now >= nextSpawnAt && !reducedMotion) {
    nextSpawnAt = now + (tune.mailEvery * 1000) * (0.7 + Math.random() * 0.6);
    spawnEnvelope(false);
  }
  for (let i = falling.length - 1; i >= 0; i--) {
    const f = falling[i];
    const g = f.group;
    const fallY = tune.fallSpeed * f.speed * dt;
    g.position.y -= fallY;
    f.phase += dt * f.sway * 2.2;
    g.position.x += Math.sin(f.phase) * dt * 0.12;
    g.rotation.z = Math.sin(f.phase) * 0.35;
    g.rotation.y += dt * 0.4;
    // the pile may have grown while this one was falling — land on its live top
    f.target.y = Math.max(f.target.y, pileTopY() + 0.05);
    // ease toward the basket as it nears the pile
    const kx = clamp(1.6 - (g.position.y - f.target.y) / 2.2, 0.05, 1.4);
    g.position.x += (f.target.x - g.position.x) * kx * dt;
    g.position.z += (f.target.z - g.position.z) * kx * dt;
    if (g.position.y <= f.target.y) settleIntoBasket(f);
  }
}

// two floor strays at open, like the chute missed
function seedStrays() {
  for (let k = 0; k < 2; k++) {
    const group = envelopeMesh(drawFromDeck());
    group.position.set(
      BASKET_POS.x + 0.9 + Math.random() * 0.8,
      0.015,
      BASKET_POS.z + 0.5 + Math.random() * 0.9);
    group.rotation.set(-Math.PI / 2, 0, Math.random() * Math.PI * 2);
    scene.add(group);
    group.updateMatrix();
    group.matrixAutoUpdate = false;
    floorStrays.push(group);
  }
}

/* ================= the opened letter (DOM overlay) ================= */

const overlay = document.getElementById('overlay');
const letterEl = document.getElementById('letter');
const returnSlot = document.getElementById('return-slot');
const postmarkEl = document.getElementById('postmark');
const cancelEl = document.getElementById('cancel-stamp');
const toEl = document.getElementById('letter-to');
const bodyEl = document.getElementById('letter-body');
const signEl = document.getElementById('letter-sign');
const refoldBtn = document.getElementById('refold');
let letterOpen = false;

function openLetter(group) {
  const letter = LETTERS[group.userData.letterIndex];

  if (letter.portal) {
    const link = document.createElement('a');
    link.className = 'return-portal';
    link.href = '../../../index.html';
    link.dataset.drift = '';
    link.setAttribute('aria-label', letter.portal.label);
    link.textContent = letter.from;
    returnSlot.replaceChildren(link);
  } else {
    returnSlot.textContent = letter.from;
  }

  postmarkEl.replaceChildren(
    ...letter.postmark.map((line) => {
      const span = document.createElement('span');
      span.textContent = line;
      return span;
    }),
  );
  cancelEl.textContent = letter.stamp;
  toEl.textContent = letter.to;
  bodyEl.replaceChildren(
    ...letter.body.map((paragraph) => {
      const p = document.createElement('p');
      p.textContent = paragraph;
      return p;
    }),
  );
  signEl.textContent = letter.sign;
  letterEl.classList.toggle('airmail', Boolean(letter.portal));

  removeEnvelopeGroup(group);
  if (reducedMotion) {
    // static placement: replace it instantly so the room never empties
    const fresh = envelopeMesh(drawFromDeck());
    scene.add(fresh);
    placeInPile(fresh);
  }

  overlay.hidden = false;
  letterOpen = true;
  letterEl.focus();
}

function refold() {
  if (!letterOpen) return;
  overlay.hidden = true;
  letterOpen = false;
  stage.focus?.();
}

refoldBtn.addEventListener('click', refold);
overlay.addEventListener('click', (event) => {
  if (event.target === overlay) refold();
});

/* ================= sound ================= */

const ambience = new Audio('assets/audio/ambience.mp3');
ambience.loop = true;
ambience.preload = 'auto';
const sfxThunk = new Audio('assets/audio/stamp-thunk.mp3');
const sfxWhoosh = new Audio('assets/audio/furnace-whoosh.mp3');
const sfxPunch = new Audio('assets/audio/punch-clock.mp3');
const sfxSip = new Audio('assets/audio/coffee-sip.mp3');
// The flutter fires on every basket landing (~every 4.5s, all session) — one
// verbatim sample reads as a loop (James, r17). A small pool with per-play
// pitch + volume jitter makes each landing its own little event.
const FLUTTER_POOL = Array.from({ length: 3 }, () => new Audio('assets/audio/letter-flutter.mp3'));
let flutterIdx = 0;
function playFlutter(level) {
  if (!soundOn) return;
  const a = FLUTTER_POOL[flutterIdx++ % FLUTTER_POOL.length];
  try { a.preservesPitch = false; } catch (e) { /* older engines */ }
  a.playbackRate = 0.8 + Math.random() * 0.45;
  a.volume = clamp(soundVol * level * (0.7 + Math.random() * 0.55), 0, 1);
  a.currentTime = 0;
  a.play().catch(() => {});
}
for (const a of [sfxThunk, sfxWhoosh, sfxPunch, sfxSip, ...FLUTTER_POOL]) a.preload = 'auto';

let soundOn = false;
let soundVol = 0.8;
const AMBIENCE_LEVEL = 0.4;

// The AM radio (2026-07-27, broadcast format 2026-07-30): Suno tracks James
// authored plus his DJ reads and the KDLO ad spots, all baked through
// tools/radio-bake.mjs (the -radio.mp3 siblings ARE the radio — never play the
// clean sources here). The program is SEQUENTIAL and loops: each DJ bit signs
// off the tune before it and intros the one after, so order is load-bearing —
// never shuffle. Plays by default when sound comes on; clicking the set
// toggles it. Volume falls off with distance from the cabinet-bank corner so it
// reads as coming from the box, plus its own slider on the sound control.
// Break format (James): song ends â†’ DJ signs it off (odd dj) â†’ two ads â†’
// DJ intros the next number (even dj) â†’ song. dj8 loops the set.
const RADIO_PROGRAM = [
  { src: 'assets/radio-music/High-Chapparal-radio.mp3', song: true },
  { src: 'assets/radio-music/dj1-radio.mp3' },
  { src: 'assets/radio-music/ad1-radio.mp3' },
  { src: 'assets/radio-music/ad2-radio.mp3' },
  { src: 'assets/radio-music/dj2-radio.mp3' },
  { src: 'assets/radio-music/Highland-Ghost-Waltz-radio.mp3', song: true },
  { src: 'assets/radio-music/dj3-radio.mp3' },
  { src: 'assets/radio-music/ad3-radio.mp3' },
  { src: 'assets/radio-music/ad4-radio.mp3' },
  { src: 'assets/radio-music/dj4-radio.mp3' },
  { src: 'assets/radio-music/Moon Over Dry Wash-radio.mp3', song: true },
  { src: 'assets/radio-music/dj5-radio.mp3' },
  { src: 'assets/radio-music/ad5-radio.mp3' },
  { src: 'assets/radio-music/ad6-radio.mp3' },
  { src: 'assets/radio-music/dj6-radio.mp3' },
  { src: 'assets/radio-music/Worn-Fiddle-Porch-radio.mp3', song: true },
  { src: 'assets/radio-music/dj7-radio.mp3' },
  { src: 'assets/radio-music/ad7-radio.mp3' },
  { src: 'assets/radio-music/ad8-radio.mp3' },
  { src: 'assets/radio-music/dj9-radio.mp3' },
  { src: 'assets/radio-music/Waltz-With-My-Darling-radio.mp3', song: true },
  { src: 'assets/radio-music/dj10-radio.mp3' },
  { src: 'assets/radio-music/ad9-radio.mp3' },
  { src: 'assets/radio-music/ad10-radio.mp3' },
  { src: 'assets/radio-music/dj8-radio.mp3' },
];
const RADIO_SONG_STARTS = RADIO_PROGRAM
  .map((item, i) => (item.song ? i : -1)).filter((i) => i >= 0);
const RADIO_POS = new THREE.Vector3(8.2, 1.5, -3.55);
const RADIO_LEVEL = 0.9;
const radioGlowMats = [];
const radioAudio = new Audio();
radioAudio.preload = 'auto';
// Back ON at load since 2026-08-10 (James's call — the 08-08 speech-QA
// silence is over). Click the radio in-world to toggle.
let radioOn = true;
let radioVol = 0.4;   // James 2026-08-10: 0.7 was too loud in general
// tune in mid-broadcast, but always on a song — never mid-commercial-break
let radioIdx = RADIO_SONG_STARTS[Math.floor(Math.random() * RADIO_SONG_STARTS.length)];
let radioGapT = null;

const radioDir = new THREE.Vector3();
const camFwd = new THREE.Vector3();
function radioFalloff() {
  const d = pos.distanceTo(RADIO_POS);
  const byDistance = clamp(1 - (d - 2.5) / 14, 0.18, 1);
  // facing factor (2026-07-28, James): the set is loudest when you look at it,
  // ducks when it's behind you — never fully gone, it's still in the room
  radioDir.copy(RADIO_POS).sub(pos).normalize();
  camera.getWorldDirection(camFwd);
  const facing = 0.4 + 0.6 * (0.5 + 0.5 * camFwd.dot(radioDir));
  return byDistance * facing;
}
function radioApplyVolume() {
  radioAudio.volume = clamp(soundVol * radioVol * RADIO_LEVEL * radioFalloff(), 0, 1);
}
function radioStart() {
  if (!radioAudio.src) radioAudio.src = RADIO_PROGRAM[radioIdx].src;
  radioApplyVolume();
  radioAudio.play().catch(() => {});
}
function radioStop() {
  radioAudio.pause();               // keeps its place in the track for the resume
  clearTimeout(radioGapT);
}
function setRadio(on) {
  radioOn = on;
  for (const m of radioGlowMats) m.emissiveIntensity = on ? 0.42 : 0.22;
  if (on && soundOn) radioStart();
  else radioStop();
}
radioAudio.addEventListener('ended', () => {
  clearTimeout(radioGapT);
  // dead air after a number, like the real thing; speech runs tighter —
  // the booth cues the next cart fast
  const gap = RADIO_PROGRAM[radioIdx].song
    ? 1800 + Math.random() * 2600
    : 600 + Math.random() * 700;
  radioGapT = setTimeout(() => {
    if (!soundOn || !radioOn) return;
    radioIdx = (radioIdx + 1) % RADIO_PROGRAM.length;
    radioAudio.src = RADIO_PROGRAM[radioIdx].src;
    radioStart();
  }, gap);
});

if (window.ElasticSoundControl) {
  ElasticSoundControl.attach({
    start: () => {
      soundOn = true;
      ambience.volume = 0;
      return ambience.play().then(() => {
        ambience.volume = soundVol * AMBIENCE_LEVEL;
        if (radioOn) radioStart();
      }).catch((err) => {
        soundOn = false;
        throw err;
      });
    },
    stop: () => {
      soundOn = false;
      ambience.pause();
      radioStop();
      voiceAudio.pause();
      endMonologue();   // don't leave him stuck 'busy' mid-sentence
    },
    setVolume: (v) => {
      soundVol = v;
      ambience.volume = v * AMBIENCE_LEVEL;
      radioApplyVolume();
    },
    channels: [{
      label: 'radio',
      value: radioVol,
      setVolume: (v) => { radioVol = v; radioApplyVolume(); },
    }, {
      label: 'voice',
      value: voiceVol,
      setVolume: (v) => { voiceVol = v; },
    }],
  });
}

function playSfx(audio, level) {
  if (!soundOn) return;
  audio.volume = clamp(soundVol * level, 0, 1);
  audio.currentTime = 0;
  audio.play().catch(() => {});
}
function playThunk() { playSfx(sfxThunk, 0.8); }

/* ================= walking controls (Mandala Shop pattern) ================= */

const EYE = 1.7;
const INSET = 0.42;
const BODY_R = 0.28;

// Free-standing furniture = keep-out circles; wall-adjacent furniture = boxes
// resolved by least-penetration push (a circle overlapping a wall can trap the
// camera between circle push and wall clamp — the fuzz sim caught it).
// (the desk chair's circle merged into the desk box in r12.3 — tucked back with
// the desk it limit-cycled against the pigeonhole box's west face)
const CIRCLES = [
  [-4.5, -1.5, 0.95],                      // basket
  [6.8, 3.5, 1.0],                         // furnace
];
// Wall-side faces extend â‰¥2m past the wall so the least-penetration push always
// resolves into the room (a face just past the wall loses to the wall clamp and
// traps the camera — the fuzz sim caught it).
// Every piece of furniture is a placeable now (2026-08-03) — camera keep-outs
// derive entirely from placed items; nothing is hand-boxed anymore.
const STATIC_BOXES = [];
// (desk, couch, tables, bookshelf, cabinet-bank boxes all retired 2026-08-03 —
// those pieces are placeables now and derive keep-outs from the layout)

// PM_LANES: floor the POSTMASTER may walk though the camera may not. Empty
// since the desk became a placeable (its station rides the item and dynamic
// stations aren't in the sim's static edge check) — the machinery stays for
// any future camera-only zone. The nav sim extracts this; keep in lockstep.
const PM_LANES = [];

// Arrange-mode furniture derives its keep-out from the item footprint: rotated
// rect â†’ AABB + body margin; faces near a wall extend well past it (the r2
// wall-flush push-face lesson). The Node sim replicates this rule verbatim.
function itemKeepOut(item) {
  const def = FURNITURE[item.type];
  const hw = def.fw * item.scale / 2, hd = def.fd * item.scale / 2;
  const c = Math.abs(Math.cos(item.rotY)), s = Math.abs(Math.sin(item.rotY));
  const ex = hw * c + hd * s, ez = hw * s + hd * c;
  let x0 = item.x - ex, x1 = item.x + ex, z0 = item.z - ez, z1 = item.z + ez;
  if (x0 < ROOM.x0 + 0.5) x0 = ROOM.x0 - 2.5;
  if (x1 > ROOM.x1 - 0.5) x1 = ROOM.x1 + 2.5;
  if (z0 < ROOM.z0 + 0.5) z0 = ROOM.z0 - 2.0;
  if (z1 > ROOM.z1 - 0.5) z1 = ROOM.z1 + 2.0;
  return [x0, x1, z0, z1];
}

// Precomputed push faces per box: a face is only a valid push target if it lies
// inside the walkable rect AND isn't buried inside a neighboring box — pushing
// to an invalid face ping-pongs against the wall clamp or the neighbor (both
// failure modes caught by the fuzz sim). Rebuilt whenever arrange mode moves
// furniture; static furniture + the current layout together.
// Overlapping (or sub-body-gap) ITEM boxes merge into one cluster AABB — two
// nearly-coincident crates otherwise bury every push face of each other and
// trap the camera (the sim caught it the night this shipped). Static boxes are
// hand-tuned L-shapes and never merge: a blanket AABB union would swallow
// walkable floor in front of the pigeonholes.
function mergeItemBoxes(list) {
  const boxes = list.map((b) => [...b]);
  const gap = BODY_R * 2;
  for (let again = true; again;) {
    again = false;
    outer: for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i], b = boxes[j];
        if (a[0] < b[1] + gap && a[1] > b[0] - gap && a[2] < b[3] + gap && a[3] > b[2] - gap) {
          boxes[i] = [Math.min(a[0], b[0]), Math.max(a[1], b[1]),
            Math.min(a[2], b[2]), Math.max(a[3], b[3])];
          boxes.splice(j, 1);
          again = true;
          break outer;
        }
      }
    }
  }
  return boxes;
}

let BOXES = [];
let BOX_PUSHES = [];
function rebuildKeepOuts() {
  // surf items are tabletop clutter — no keep-out footprint
  BOXES = [...STATIC_BOXES, ...mergeItemBoxes(
    archiveLayout.items.filter((i) => FURNITURE[i.type] && !FURNITURE[i.type].surf)
      .map(itemKeepOut))];
  refreshDynStations();
  BOX_PUSHES = BOXES.map(([x0, x1, z0, z1], bi) => {
  const l = x0 - BODY_R, r = x1 + BODY_R, n = z0 - BODY_R, s = z1 + BODY_R;
  const wx0 = ROOM.x0 + INSET, wx1 = ROOM.x1 - INSET;
  const wz0 = ROOM.z0 + INSET, wz1 = ROOM.z1 - INSET;
  const zMid = (Math.max(z0, wz0) + Math.min(z1, wz1)) / 2;
  const xMid = (Math.max(x0, wx0) + Math.min(x1, wx1)) / 2;
  const buried = (px, pz) => BOXES.some(([ox0, ox1, oz0, oz1], oi) => oi !== bi &&
    px > ox0 - BODY_R && px < ox1 + BODY_R && pz > oz0 - BODY_R && pz < oz1 + BODY_R);
  const faces = [];
  if (l >= wx0 && l <= wx1 && !buried(l, zMid)) {
    faces.push({ dist: (p) => p.x - l, apply: (p) => { p.x = l; } });
  }
  if (r >= wx0 && r <= wx1 && !buried(r, zMid)) {
    faces.push({ dist: (p) => r - p.x, apply: (p) => { p.x = r; } });
  }
  if (n >= wz0 && n <= wz1 && !buried(xMid, n)) {
    faces.push({ dist: (p) => p.z - n, apply: (p) => { p.z = n; } });
  }
  if (s >= wz0 && s <= wz1 && !buried(xMid, s)) {
    faces.push({ dist: (p) => s - p.z, apply: (p) => { p.z = s; } });
  }
  return { l, r, n, s, faces };
  });
}
rebuildKeepOuts();

// in-browser trap check (arrange mode runs it after every save): constrain a
// cloud of random points; report any that resolve inside a keep-out
function fuzzKeepOuts(n = 5000) {
  const bad = [];
  for (let k = 0; k < n; k++) {
    const p = {
      x: ROOM.x0 + Math.random() * (ROOM.x1 - ROOM.x0),
      z: ROOM.z0 + Math.random() * (ROOM.z1 - ROOM.z0),
    };
    constrain(p);
    const inside = BOX_PUSHES.some((bp) => p.x > bp.l + 1e-6 && p.x < bp.r - 1e-6 &&
      p.z > bp.n + 1e-6 && p.z < bp.s - 1e-6);
    if (inside && bad.length < 5) bad.push([p.x, p.z]);
  }
  return bad;
}

function constrain(p) {
  for (let pass = 0; pass < 3; pass++) {
    for (const [cx, cz, r] of CIRCLES) {
      const dx = p.x - cx, dz = p.z - cz;
      const rr = r + BODY_R, d2 = dx * dx + dz * dz;
      if (d2 < rr * rr && d2 > 1e-9) {
        const d = Math.sqrt(d2);
        p.x = cx + dx / d * rr;
        p.z = cz + dz / d * rr;
      }
    }
    for (const bp of BOX_PUSHES) {
      if (p.x > bp.l && p.x < bp.r && p.z > bp.n && p.z < bp.s) {
        let best = null, bestD = Infinity;
        for (const f of bp.faces) {
          const d = f.dist(p);
          if (d < bestD) { bestD = d; best = f; }
        }
        if (best) best.apply(p);
      }
    }
    if (pmModel) {   // he is solid too, gently
      const dx = p.x - pmGroup.position.x, dz = p.z - pmGroup.position.z;
      const rr = 0.55, d2 = dx * dx + dz * dz;
      if (d2 < rr * rr && d2 > 1e-9) {
        const d = Math.sqrt(d2);
        p.x = pmGroup.position.x + dx / d * rr;
        p.z = pmGroup.position.z + dz / d * rr;
      }
    }
    p.x = clamp(p.x, ROOM.x0 + INSET, ROOM.x1 - INSET);
    p.z = clamp(p.z, ROOM.z0 + INSET, ROOM.z1 - INSET);
  }
  return p;
}

// The house spawn (James's captured corner, 2026-08-10): up by the south-east
// ceiling with the whole office in view, instead of down between the stacks.
const SPAWN_DEFAULT = { x: 7.07, y: 1.96, z: -4.68, yaw: -3.96, pitch: -0.322 };
const pos = new THREE.Vector3(SPAWN_DEFAULT.x, SPAWN_DEFAULT.y, SPAWN_DEFAULT.z);
let yaw = SPAWN_DEFAULT.yaw, pitch = SPAWN_DEFAULT.pitch,
  tYaw = SPAWN_DEFAULT.yaw, tPitch = SPAWN_DEFAULT.pitch;  // yaw 0 faces -z
// a captured spawn (tuner "capture spawn" button) overrides the default:
// start exactly where James stood when he pressed it
if (tune.spawn && Number.isFinite(tune.spawn.x)) {
  pos.set(tune.spawn.x,
    Math.min(ROOM.h - 0.25, Math.max(EYE, tune.spawn.y)), tune.spawn.z);
  yaw = tYaw = tune.spawn.yaw || 0;
  pitch = tPitch = tune.spawn.pitch || 0;
}
const vel = new THREE.Vector3();
const keys = new Set();

addEventListener('keydown', (e) => {
  if (letterOpen) {
    if (e.key === 'Escape') refold();
    return;
  }
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  keys.add(e.code);
  if (e.code === 'KeyE') openNearestEnvelope();
});
addEventListener('keyup', (e) => keys.delete(e.code));
addEventListener('blur', () => keys.clear());

// drag look — swing only (James 2026-07-28: swing is the default, no switch).
// The old grab/swing toggle and its shared 'elastic-look-mode' key are gone.
const lookMode = 'swing';

const mouse = new THREE.Vector2();
let dragging = false, moved = 0, lastX = 0, lastY = 0, downAt = 0;
stage.addEventListener('pointerdown', (e) => {
  dragging = true; moved = 0; lastX = e.clientX; lastY = e.clientY; downAt = performance.now();
  stage.setPointerCapture(e.pointerId);
});
stage.addEventListener('pointermove', (e) => {
  mouse.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  if (!dragging) return;
  const dx = e.clientX - lastX, dy = e.clientY - lastY;
  moved += Math.abs(dx) + Math.abs(dy);
  lastX = e.clientX; lastY = e.clientY;
  const s = lookMode === 'swing' ? -1 : 1;
  tYaw += s * dx * 0.0014;
  tPitch = clamp(tPitch + s * dy * 0.0013, -1.05, 1.05);
});
stage.addEventListener('pointerup', (e) => {
  dragging = false;
  if (moved < 7 && performance.now() - downAt < 400) handleClick(e);
});

let dollyImpulse = 0;
const TOP_SPEED = 3.5;   // cap for stacked wheel dollies (raised with the 08-04 walk bump)
addEventListener('wheel', (e) => {
  if (e.target.closest?.('.es-sound, #tuner, #tuner-btn')) {
    if (e.ctrlKey) e.preventDefault();
    return;
  }
  e.preventDefault();
  dollyImpulse = clamp(dollyImpulse + Math.sign(e.deltaY) * -0.55, -1.5, 1.5);
}, { passive: false });

/* ================= clicking ================= */

let hoverDirty = true;
const hoverTargets = [];
function rayTargets() {
  if (hoverDirty) {
    hoverDirty = false;
    hoverTargets.length = 0;
    hoverTargets.push(...envClickables, ...doorMeshes, ...punchClockMeshes,
      ...propClickables.furnace, ...propClickables.radio);
    if (pmProxy && !pmAway) hoverTargets.push(pmProxy);   // never the skinned mesh
  }
  return hoverTargets;
}

let drifted = false;
function triggerDrift(id) {
  if (drifted) return;
  drifted = true;
  document.getElementById(id)?.click();
}

function handleClick(e) {
  if (letterOpen) return;
  mouse.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObjects(rayTargets(), false);
  if (!hits.length) return;
  const obj = hits[0].object;
  if (obj.userData.envelope) return openLetter(obj.userData.envelope);
  if (doorMeshes.has(obj)) return triggerDrift('drift-door');
  if (punchClockMeshes.has(obj)) {
    playSfx(sfxPunch, 0.8);
    punchFlash = 1.2;
    return;
  }
  if (propClickables.furnace.has(obj)) {
    furnaceFlare = Math.max(furnaceFlare, 0.5);
    playSfx(sfxWhoosh, 0.5);
    return;
  }
  if (propClickables.radio.has(obj)) return setRadio(!radioOn);
  if (obj === pmProxy) postmasterClicked();
}

function openNearestEnvelope() {
  if (letterOpen) return;
  let best = null, bestD = 36;
  const all = [...falling.map((f) => f.group), ...basketPile, ...floorStrays];
  for (const g of all) {
    const d = g.position.distanceToSquared(pos);
    if (d < bestD) { bestD = d; best = g; }
  }
  if (best) openLetter(best);
}

/* ================= tuner panel ================= */

const TUNER_SPEC = [
  ['pmGlow', 0.0, 1.0, 0.02], ['pmSplay', 0, 25, 1],
  ['ambient', 0.2, 1.8, 0.05], ['fluor', 0.0, 3.5, 0.05],
  ['bulb', 0.4, 3.0, 0.05], ['lamp', 0.0, 4.0, 0.05],
  ['furnace', 0.0, 3.0, 0.05], ['shaft', 0.0, 0.5, 0.01],
  ['fog', 0.0, 0.08, 0.002], ['mailEvery', 2, 15, 0.5],
  ['fallSpeed', 0.15, 1.2, 0.05], ['pace', 0.4, 2.5, 0.05],
  ['pmHeight', 1.5, 2.2, 0.01],
  ['lipSync', -0.1, 1.0, 0.005],
  ['lipPunch', 0.6, 1.5, 0.05],
  ['walk', 0.5, 1.6, 0.05],
];
for (const [key, min, max] of TUNER_SPEC) {
  if (!(tune[key] >= min && tune[key] <= max)) tune[key] = TUNE_DEFAULTS[key];
}
{
  const btn = document.createElement('button');
  btn.id = 'tuner-btn';
  btn.textContent = 'tune the office';
  document.body.appendChild(btn);
  const panel = document.createElement('div');
  panel.id = 'tuner';
  panel.innerHTML =
    '<div class="head"><span class="title">tune the office</span>' +
    '<button type="button" class="freeze">freeze</button>' +
    '<button type="button" class="spawncap">capture spawn</button>' +
    '<span class="tsize"><button type="button" class="tminus">A−</button>' +
    '<button type="button" class="tplus">A+</button></span></div>' +
    '<div class="grid"></div>' +
    '<div class="foot"><span>values:</span><input readonly><button type="button">reset</button></div>';
  document.body.appendChild(panel);
  const grid = panel.querySelector('.grid');
  const jsonOut = panel.querySelector('.foot input');
  const resetBtn = panel.querySelector('.foot button');
  const freezeBtn = panel.querySelector('.freeze');

  // freeze: museum mode — pmStill drives pmTick (clips stop, he holds pose)
  const syncFreeze = () => freezeBtn.classList.toggle('on', tune.pmStill >= 0.5);
  freezeBtn.addEventListener('click', () => {
    tune.pmStill = tune.pmStill >= 0.5 ? 0 : 1;
    localStorage.setItem('dlo-room-tuner-v3', JSON.stringify(tune));
    syncFreeze();
  });

  // capture spawn: bank the live camera (position + eye height + gaze) as the
  // load-time start, persisted with the tuner; also copied to the clipboard so
  // it can be pasted to Claude to bake as the default. Reset clears it.
  const spawnBtn = panel.querySelector('.spawncap');
  spawnBtn.addEventListener('click', () => {
    tune.spawn = {
      x: +pos.x.toFixed(2), y: +pos.y.toFixed(2), z: +pos.z.toFixed(2),
      yaw: +tYaw.toFixed(3), pitch: +tPitch.toFixed(3),
    };
    localStorage.setItem('dlo-room-tuner-v3', JSON.stringify(tune));
    jsonOut.value = JSON.stringify(tune);
    try { navigator.clipboard.writeText(JSON.stringify(tune.spawn)); } catch (e) { /* served-only nicety */ }
    spawnBtn.textContent = 'spawn captured';
    setTimeout(() => { spawnBtn.textContent = 'capture spawn'; }, 1400);
  });

  // A− / A+ text size, persisted per browser
  let tunerScale = parseFloat(localStorage.getItem('dlo-tuner-scale') || '1') || 1;
  const applyScale = () => { panel.style.fontSize = (0.95 * tunerScale) + 'rem'; };
  panel.querySelector('.tminus').addEventListener('click', () => {
    tunerScale = Math.max(0.7, +(tunerScale - 0.1).toFixed(2));
    localStorage.setItem('dlo-tuner-scale', tunerScale); applyScale();
  });
  panel.querySelector('.tplus').addEventListener('click', () => {
    tunerScale = Math.min(1.8, +(tunerScale + 0.1).toFixed(2));
    localStorage.setItem('dlo-tuner-scale', tunerScale); applyScale();
  });
  applyScale();
  syncFreeze();
  const vals = {};
  const refresh = () => {
    for (const [key] of TUNER_SPEC) {
      vals[key].range.value = tune[key];
      vals[key].out.textContent = String(+(+tune[key]).toFixed(3));
    }
    jsonOut.value = JSON.stringify(tune);
    applyTune();
  };
  for (const [key, min, max, step] of TUNER_SPEC) {
    const row = document.createElement('div');
    row.className = 'ctl';
    const label = document.createElement('label');
    label.textContent = key;
    const range = document.createElement('input');
    range.type = 'range'; range.min = min; range.max = max; range.step = step;
    const out = document.createElement('span');
    out.className = 'val';
    range.addEventListener('input', () => {
      tune[key] = parseFloat(range.value);
      localStorage.setItem('dlo-room-tuner-v3', JSON.stringify(tune));
      refresh();
    });
    row.append(label, range, out);
    grid.appendChild(row);
    vals[key] = { range, out };
  }
  resetBtn.addEventListener('click', () => {
    tune = { ...TUNE_DEFAULTS };
    localStorage.removeItem('dlo-room-tuner-v3');
    refresh();
  });
  btn.addEventListener('click', () => {
    panel.classList.toggle('open');
    btn.classList.toggle('open', panel.classList.contains('open'));
  });
  // Click anywhere off the panel dismisses it (house rule 2026-07-25).
  // pointerdown, not click: a slider drag released off-panel is not "away".
  document.addEventListener('pointerdown', (e) => {
    if (!panel.classList.contains('open')) return;
    if (panel.contains(e.target) || btn.contains(e.target)) return;
    panel.classList.remove('open');
    btn.classList.remove('open');
  });
  refresh();
}

function applyTune() {
  scene.fog.density = tune.fog;
  // shaft opacity is per-plane and view-dependent — the tick loop applies
  // tune.shaft × angle fade every frame, nothing to set here
  lampLight.intensity = lampPlaced ? tune.lamp : 0;   // dark unless a lamp is placed
  hemi.intensity = tune.ambient;
  for (const l of bulbLights) l.intensity = tune.bulb;
  for (const l of fluorLights) l.intensity = tune.fluor;
  for (const m of pmMats) m.emissiveIntensity = tune.pmGlow;
  if (pmModel && pmSizeY > 0) {
    const s = tune.pmHeight / pmSizeY;
    pmModel.scale.setScalar(s);
    pmModel.position.y = -pmMinY * s;
  }
}

/* ================= main loop ================= */

const clock = new THREE.Clock();
const fwd = new THREE.Vector3(), right = new THREE.Vector3(), wish = new THREE.Vector3();
const lookEuler = new THREE.Euler(0, 0, 0, 'YXZ');
let frame = 0;
let resStillAt = 0;

function tick() {
  requestAnimationFrame(tick);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  const now = performance.now();
  frame++;

  if (mixer) mixer.update(dt);
  gaitMeterTick();   // ?gait=1 — measures the RENDERED feet, on screen
  // pmSplay: rotate the upper arms outward AFTER the mixer writes bone poses —
  // the retargeted clips bake v1's arm angles, and the round v2 body needs the
  // extra clearance (hands clipped the thighs mid-stride without it).
  // (only while clips are writing bone poses — with the mixer stopped the add
  // would compound every frame: the museum-mode windmill of 2026-08-07)
  if (armBoneL && tune.pmSplay > 0 && !pmStillOn) {
    const rad = tune.pmSplay * Math.PI / 180;
    armBoneL.quaternion.multiply(SPLAY_Q.setFromAxisAngle(AXIS_Z, rad));
    armBoneR.quaternion.multiply(SPLAY_Q.setFromAxisAngle(AXIS_Z, -rad));
  }
  pmTick(dt, now);
  mailTick(dt, now);
  voiceTick(dt);

  // furnace flicker + flare decay
  if (!reducedMotion) {
    const flick = Math.sin(t * 11.3) * 0.12 + Math.sin(t * 23.7) * 0.08;
    furnaceFlare = Math.max(0, furnaceFlare - dt * 0.8);
    furnaceLight.intensity = tune.furnace * (1 + flick) + furnaceFlare * 5.5;
    if (punchFlash > 0) punchFlash -= dt;
  }

  // light shafts: each crossed plane fades as it goes edge-on to the camera —
  // the face-on plane carries the beam, the edge-on one dissolves instead of
  // reading as a pane of glass
  for (const sp of shaftPlanes) {
    shaftToCam.subVectors(camera.position, sp.mesh.position).normalize();
    const f = Math.abs(shaftToCam.dot(sp.normal));
    sp.mat.opacity = tune.shaft * Math.min(1, f * 1.7);
  }

  // ghost-through: only the fixture the eye is inside of fades — everything
  // else stays fully solid
  for (const cf of ceilingFixtures) {
    const near = camera.position.distanceToSquared(cf.pos) < 1.1;   // ~1m bubble
    const target = near ? 0.1 : 1;
    if (Math.abs(cf.fade - target) > 0.005) {
      cf.fade = damp(cf.fade, target, 14, dt);
      for (const m of cf.mats) m.opacity = cf.fade;
    }
  }

  // walk + look
  yaw = damp(yaw, tYaw, 22, dt);
  pitch = damp(pitch, tPitch, 22, dt);
  fwd.set(-Math.sin(yaw), 0, -Math.cos(yaw));
  right.set(-fwd.z, 0, fwd.x);
  wish.set(0, 0, 0);
  if (keys.has('KeyW') || keys.has('ArrowUp')) wish.add(fwd);
  if (keys.has('KeyS') || keys.has('ArrowDown')) wish.sub(fwd);
  if (keys.has('KeyA') || keys.has('ArrowLeft')) wish.sub(right);
  if (keys.has('KeyD') || keys.has('ArrowRight')) wish.add(right);
  // 2.78 = 2.2 +10% (08-03) +15% more (08-04, James: still frustratingly slow)
  if (wish.lengthSq() > 0) wish.normalize().multiplyScalar(2.78);
  if (Math.abs(dollyImpulse) > 0.01) {
    wish.addScaledVector(fwd, dollyImpulse * 2.78);
    dollyImpulse *= Math.pow(0.0025, dt);
  }
  if (wish.length() > TOP_SPEED) wish.setLength(TOP_SPEED);
  // shift = sprint (James, 2026-08-04): double, applied after the cap on purpose
  if (keys.has('ShiftLeft') || keys.has('ShiftRight')) wish.multiplyScalar(2);
  // R/F: rise and sink (2026-08-04, promoted from arrange-only to the live
  // view at James's ask) — smooth while held, clamped floor to rafters
  if (keys.has('KeyR')) pos.y = Math.min(ROOM.h - 0.25, pos.y + 2.4 * dt);
  if (keys.has('KeyF')) pos.y = Math.max(EYE, pos.y - 2.4 * dt);
  vel.x = damp(vel.x, wish.x, 6, dt);
  vel.z = damp(vel.z, wish.z, 6, dt);
  pos.x += vel.x * dt;
  pos.z += vel.z * dt;
  constrain(pos);
  camera.position.copy(pos);
  lookEuler.set(pitch, yaw, 0);
  camera.quaternion.setFromEuler(lookEuler);

  // dynamic resolution
  const camMoving = dragging || vel.lengthSq() > 0.02 || Math.abs(dollyImpulse) > 0.05
    || Math.abs(yaw - tYaw) > 0.002 || Math.abs(pitch - tPitch) > 0.002;
  if (camMoving) resStillAt = t;
  applyRes(t - resStillAt > 0.25 ? RES_HIGH : RES_LOW);

  // hover cursor, throttled
  if (frame % 6 === 0 && !dragging && !letterOpen) {
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(rayTargets(), false);
    stage.style.cursor = hits.length ? 'pointer' : 'grab';
  }

  // radio falloff tracks position AND view direction now — a look-around changes
  // it, so the throttle is tighter than the old walking-speed one
  if (frame % 3 === 0 && soundOn && radioOn && !radioAudio.paused) radioApplyVolume();

  renderer.render(scene, camera);
}
tick();

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

/* ================= start ================= */

applyTune();
seedStrays();
guaranteedAirmail = true;
if (reducedMotion) {
  // pre-place a small pile, no falling
  for (let k = 0; k < 3; k++) {
    const group = envelopeMesh(k === 0
      ? LETTERS.findIndex((l) => l.portal)
      : drawFromDeck());
    scene.add(group);
    placeInPile(group);
  }
} else {
  spawnEnvelope(true);
  spawnEnvelope(true);
  nextSpawnAt = performance.now() + 2500;
}

window.setInterval(() => {
  shiftTick();
  if (!document.hidden) ambientTick(performance.now());
  if (!document.hidden) voiceMonologueTick(performance.now());
}, 1000);
shiftTick();

/* ================= arrange mode (?arrange=1, served copy only) ============== */

// James's furniture editor (2026-07-27): palette of archive props, drag on the
// floor, wheel rotates, size/shade sliders, saves through the layout endpoint.
// Dynamic import so visitors never pay for it.
if (new URLSearchParams(location.search).has('arrange') && location.protocol !== 'file:') {
  import('./arrange.js').then(({ initArrange }) => initArrange({
    THREE, scene, camera, stage, ROOM,
    FURNITURE, WALL_ART, layout: archiveLayout, records: furnitureRecords,
    buildFurnitureItem, buildArtItem, removeFurnitureItem, rebuildKeepOuts,
    fuzzKeepOuts, itemKeepOut, applyShade,
    nav: { nodes: NAV_NODES, edges: NAV_EDGES },
    // arrange-only crane: raise the working eye height (R/F). Resets on exit
    // because exit reloads the page.
    setEye: (h) => { pos.y = Math.min(ROOM.h - 0.25, Math.max(EYE, h)); return pos.y; },
    getEye: () => pos.y,
  })).catch((err) => console.warn('[dlo] arrange mode failed to load:', err));
}
