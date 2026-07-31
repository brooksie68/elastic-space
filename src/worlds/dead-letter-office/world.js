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
  ambient: 0.95,  // hemisphere fill
  fluor: 1.7,     // fluorescent fixture intensity
  bulb: 1.8,      // hanging-bulb intensity multiplier
  lamp: 1.8,      // banker's lamp glow
  furnace: 1.1,   // furnace ember glow
  shaft: 0.16,    // window light-shaft opacity
  fog: 0.016,     // basement murk density
  mailEvery: 4.5, // seconds between falling letters
  fallSpeed: 0.4, // m/s base descent
  pace: 1.0,      // postmaster activity gap multiplier (higher = lazier)
  walk: 0.95,     // postmaster walk speed m/s
};
let tune = { ...TUNE_DEFAULTS };
// v2 key (2026-07-22 brightness pass): stored v1 values were tuned against the
// dungeon-dark build and would override the new, much brighter defaults
try { Object.assign(tune, JSON.parse(localStorage.getItem('dlo-room-tuner-v2') || '{}')); } catch (e) { /* fresh */ }

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
for (const [x, y, z, lit] of BULBS) {
  if (lit) {
    const pt = new THREE.PointLight(0xffc87a, 1.5, 13, 1.6);
    pt.position.set(x, y - 0.09, z);
    bulbLights.push(pt);
    scene.add(pt);
  }
  const cordLen = ROOM.h - y - 0.18;
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, cordLen + 0.36, 5), cordMat);
  cord.position.set(x, y + 0.18 + cordLen / 2, z);
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.13, 18, 1, true), shadeMat);
  shade.position.set(x, y + 0.1, z);
  const glass = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), bulbMat);
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
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.07, 0.28), fluorBodyMat);
  g.add(body);
  for (const off of [-0.07, 0.07]) {
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 1.15, 10), fluorTubeMat);
    tube.rotation.z = Math.PI / 2;
    tube.position.set(0, -0.05, off);
    g.add(tube);
  }
  for (const rx of [-0.45, 0.45]) {
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, ROOM.h - y, 5), cordMat);
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

// DEAD LETTER OFFICE — the house sign, north wall
addSign(signTexture(1024, 512, (g, w, h) => {
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
}), 2.4, 1.2, -0.8, 2.55, ROOM.z0 + 0.02, 0);

// stopped wall clock — 3:11, forever
addSign(signTexture(256, 256, (g) => {
  g.clearRect(0, 0, 256, 256);
  g.fillStyle = '#d8cdae';
  g.beginPath(); g.arc(128, 128, 120, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#26221c'; g.lineWidth = 12;
  g.beginPath(); g.arc(128, 128, 114, 0, Math.PI * 2); g.stroke();
  g.fillStyle = '#26221c';
  for (let i = 0; i < 12; i++) {
    const a = i * Math.PI / 6;
    g.save(); g.translate(128, 128); g.rotate(a);
    g.fillRect(-4, -104, 8, 22);
    g.restore();
  }
  const hand = (a, len, wdt) => {
    g.save(); g.translate(128, 128); g.rotate(a);
    g.fillRect(-wdt / 2, -len, wdt, len + 12);
    g.restore();
  };
  hand((3 + 11 / 60) / 12 * Math.PI * 2, 58, 10);  // hour: 3:11
  hand(11 / 60 * Math.PI * 2, 92, 6);              // minute
  g.beginPath(); g.arc(128, 128, 9, 0, Math.PI * 2); g.fill();
}), 0.66, 0.66, 2.6, 2.9, ROOM.z0 + 0.02, 0);

// tally boards — mechanical drum counters (2026-07-28, James: "look mechanical").
// Each digit lives in its own riveted window on a rolling wheel: brushed housing,
// drum shading, a flap seam across the middle. DEAD LETTERS ticks up live from
// deep in the hundreds of thousands; CLAIMED reads 17, forever.
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
const texTallyClaimed = tallyTexture('claimed', 'CLAIMED', '0000017');
addSign(texTallyDead, 1.35, 0.53, -6.9, 3.15, ROOM.z0 + 0.02, 0, { lit: true });
addSign(texTallyClaimed, 1.35, 0.53, -6.9, 2.5, ROOM.z0 + 0.02, 0, { lit: true });
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
const shaftMat = (() => {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 256;
  const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, 'rgba(157,184,204,0.9)');
  gr.addColorStop(1, 'rgba(157,184,204,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 256);
  const t = new THREE.CanvasTexture(c);
  return new THREE.MeshBasicMaterial({
    map: t, transparent: true, opacity: tune.shaft,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  });
})();
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
  const shaft = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 4.6), shaftMat);
  shaft.position.set(x, y, z);
  shaft.rotation.set(0, Math.PI / 2, zRoll);
  scene.add(shaft);
}
mkWindow(ROOM.x0 + 0.06, -2.0, Math.PI / 2);   // west (the original)
mkShaft(ROOM.x0 + 1.65, 1.85, -1.6, 0.62);
mkWindow(-5.5, ROOM.z1 - 0.06, Math.PI);       // south pair
mkShaft(-5.2, 1.85, ROOM.z1 - 1.6, -0.62);
mkWindow(5.8, ROOM.z1 - 0.06, Math.PI);
mkShaft(5.5, 1.85, ROOM.z1 - 1.6, -0.62);

// radiator under the window — its fins speak a little Morse
{
  const fins = [];
  for (let i = 0; i < 9; i++) {
    const g = new THREE.CylinderGeometry(0.05, 0.05, 0.78, 8);
    g.translate(0, 0, i * 0.115 - 0.46);
    fins.push(g);
  }
  const top = new THREE.CylinderGeometry(0.035, 0.035, 1.05, 8);
  top.rotateX(Math.PI / 2);
  top.translate(0, 0.36, 0);
  fins.push(top);
  const rad = new THREE.Mesh(mergeGeometries(fins),
    new THREE.MeshStandardMaterial({ color: 0x5a5148, roughness: 0.6, metalness: 0.5 }));
  rad.position.set(ROOM.x0 + 0.32, 0.42, -2.0);
  scene.add(rad);
}

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
  addSign(signTexture(256, 96, (g, w, h) => {
    g.fillStyle = '#8a8064'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#26221c';
    g.font = '700 54px "Courier New", monospace';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('STAIRS ↗', w / 2, h / 2 + 2);
  }), 0.56, 0.21, ROOM.x0 + 0.03, 2.62, 2.6, Math.PI / 2);
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

const pigeonholeSlots = [];   // world positions envelopes fly into
{
  const unit = new THREE.Group();
  const COLS = 6, ROWS = 4, CW = 0.5, CH = 0.42, DEEP = 0.4;
  const W = COLS * CW + 0.08, H = ROWS * CH + 0.08;
  const back = new THREE.Mesh(uvScale(new THREE.BoxGeometry(W, H, 0.04), W / WOOD_TILE, H / WOOD_TILE), matWood);
  back.position.set(0, H / 2, -DEEP / 2);
  unit.add(back);
  const shelfGeos = [];
  for (let r = 0; r <= ROWS; r++) {
    const g = new THREE.BoxGeometry(W, 0.035, DEEP);
    g.translate(0, r * CH + 0.02, 0);
    shelfGeos.push(g);
  }
  for (let cIdx = 0; cIdx <= COLS; cIdx++) {
    const g = new THREE.BoxGeometry(0.035, H, DEEP);
    g.translate(cIdx * CW - W / 2 + 0.04, H / 2, 0);
    shelfGeos.push(g);
  }
  unit.add(new THREE.Mesh(uvScale(mergeGeometries(shelfGeos), 2, 2), matWood));
  // a few resident bundles
  for (let k = 0; k < 7; k++) {
    const cIdx = Math.floor(Math.random() * COLS), r = Math.floor(Math.random() * ROWS);
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1 + Math.random() * 0.14, 0.24), matPaper);
    b.position.set(cIdx * CW - W / 2 + CW / 2 + 0.04, r * CH + 0.12, 0.02);
    b.rotation.y = (Math.random() - 0.5) * 0.3;
    unit.add(b);
  }
  unit.position.set(6.25, 0.86, ROOM.z0 + 0.26);
  scene.add(unit);
  // stout legs
  for (const lx of [-W / 2 + 0.1, W / 2 - 0.1]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.86, 0.3), matWood);
    leg.position.set(6.25 + lx, 0.43, ROOM.z0 + 0.26);
    scene.add(leg);
  }
  for (let cIdx = 0; cIdx < COLS; cIdx++) {
    for (let r = 0; r < ROWS; r++) {
      pigeonholeSlots.push(new THREE.Vector3(
        6.25 + cIdx * CW - W / 2 + CW / 2 + 0.04,
        0.86 + r * CH + 0.2,
        ROOM.z0 + 0.42));
    }
  }
}

/* ================= east wall: the file cabinet bank, coat rack ============== */

// A double-deep bank of green filing cabinets (2026-07-22, James): five wide
// along the wall, two rows deep. The lone cabinet + coffee hotplate it replaces
// moved on: coffee service lives on the donut table by the desk now.
let cabinetTopY = 1.32;
const cabMat = new THREE.MeshStandardMaterial({ color: 0x4e5a54, roughness: 0.55, metalness: 0.5 });
const handleMat = new THREE.MeshStandardMaterial({ color: 0x9a8a5a, metalness: 0.8, roughness: 0.4 });
{
  const drawerGeos = [], handleGeos = [], bodyGeos = [];
  for (let row = 0; row < 2; row++) {
    for (let i = 0; i < 5; i++) {
      const cx = 8.55 - row * 0.68, cz = -3.9 + i * 0.72;
      const body = new THREE.BoxGeometry(0.62, 1.32, 0.66);
      body.translate(cx, 0.66, cz);
      bodyGeos.push(body);
      if (row === 1) {   // only the room-facing row shows drawer fronts
        for (let d = 0; d < 4; d++) {
          const dr = new THREE.BoxGeometry(0.03, 0.26, 0.56);
          dr.translate(cx - 0.33, 0.24 + d * 0.31, cz);
          drawerGeos.push(dr);
          const h = new THREE.BoxGeometry(0.03, 0.035, 0.16);
          h.translate(cx - 0.36, 0.3 + d * 0.31, cz);
          handleGeos.push(h);
        }
      }
    }
  }
  scene.add(new THREE.Mesh(mergeGeometries(bodyGeos), cabMat));
  scene.add(new THREE.Mesh(mergeGeometries(drawerGeos), matIron));
  scene.add(new THREE.Mesh(mergeGeometries(handleGeos), handleMat));
  // one drawer left open, papers poking out — nobody closes anything down here
  const open = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.24, 0.54), cabMat);
  open.position.set(7.65, 1.13, -2.46);
  scene.add(open);
  const openPapers = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, 0.44), matPaper);
  openPapers.position.set(7.62, 1.27, -2.46);
  openPapers.rotation.z = 0.08;
  scene.add(openPapers);
}

// coat rack with the postmaster's off-duty coat and mail bag (he is never off duty)
{
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.045, 1.9, 8), matWood);
  pole.position.set(8.4, 0.95, -5.35);
  scene.add(pole);
  for (let i = 0; i < 3; i++) {
    const peg = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.22, 6), matWood);
    peg.position.set(8.4, 1.72 - i * 0.06, -5.35);
    peg.rotation.z = Math.PI / 2 - 0.4;
    peg.rotation.y = i * 2.1;
    scene.add(peg);
  }
  const bag = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.3, 4, 10),
    new THREE.MeshStandardMaterial({ color: 0x7a6a4c, roughness: 0.95 }));
  bag.position.set(8.28, 1.28, -5.18);
  bag.scale.set(1, 1, 0.6);
  scene.add(bag);
}

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
{
  const SH_X = 8.69, SH_Z = 1.1, SH_W = 1.4, SH_H = 1.88, SH_D = 0.32;
  const side = (z) => {
    const m = new THREE.Mesh(uvScale(new THREE.BoxGeometry(SH_D, SH_H, 0.05), 0.3, 1.6), matWood);
    m.position.set(SH_X, SH_H / 2, z);
    scene.add(m);
  };
  side(SH_Z - SH_W / 2); side(SH_Z + SH_W / 2);
  const back = new THREE.Mesh(uvScale(new THREE.BoxGeometry(0.04, SH_H, SH_W), 1.2, 1.6), matWood);
  back.position.set(SH_X + SH_D / 2 - 0.02, SH_H / 2, SH_Z);
  scene.add(back);
  const rowKinds = ['manuals', 'manuals', 'romance', 'romance'];
  for (let s = 0; s < 5; s++) {                       // 5 boards: bottom to top
    const y = 0.06 + s * (SH_H - 0.12) / 4;
    const board = new THREE.Mesh(uvScale(new THREE.BoxGeometry(SH_D, 0.045, SH_W), 0.3, 1.4), matWood);
    board.position.set(SH_X, y, SH_Z);
    scene.add(board);
    if (s < 4) {                                      // books above this board
      const row = new THREE.Mesh(
        new THREE.PlaneGeometry(SH_W - 0.1, 0.36),
        new THREE.MeshLambertMaterial({ map: bookRowTex(rowKinds[s]) }));
      row.position.set(SH_X - SH_D / 2 + 0.09, y + 0.21, SH_Z);
      row.rotation.y = -Math.PI / 2;
      scene.add(row);
    }
  }
}

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
  { t: 'SÉANCE REQUESTS' }, { t: 'MANIFESTOS' },
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
const matBoxAtlas = new THREE.MeshLambertMaterial({ map: boxAtlasTex });
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
  'shelf-double': { label: 'shelf row (2-sided)', len: 3.0, dep: 0.85, h: 2.06, levels: 4, fill: 0.92, double: true, fw: 3.14, fd: 0.99 },
  'shelf-single': { label: 'wall shelf', len: 1.7, dep: 0.42, h: 2.06, levels: 4, fill: 0.92, double: false, fw: 1.84, fd: 0.56 },
  'shelf-tall': { label: 'tall shelf', len: 2.2, dep: 0.42, h: 2.62, levels: 5, fill: 0.92, double: false, fw: 2.34, fd: 0.56 },
  'shelf-sparse': { label: 'half-empty shelf', len: 2.2, dep: 0.42, h: 2.06, levels: 4, fill: 0.45, double: false, fw: 2.34, fd: 0.56 },
  'stack-3': { label: 'stack of 3 boxes', n: 3, fw: 0.62, fd: 0.56 },
  'stack-2': { label: 'stack of 2 boxes', n: 2, fw: 0.62, fd: 0.56 },
  'box': { label: 'lone box', n: 1, fw: 0.56, fd: 0.5 },
  'crate': { label: 'wooden crate', fw: 1.0, fd: 0.8 },
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
    m.emissive?.setScalar(0);                       // clears any nav-warning tint
  }
}

const furnitureRecords = [];                        // live {item, group, mats} list
function buildFurnitureItem(item) {
  const def = FURNITURE[item.type];
  if (!def) return null;
  const rnd = mulberry32((item.seed ?? 1) * 2654435761 >>> 0 || 1);
  const parts = def.n !== undefined ? buildStack(def, rnd)
    : item.type === 'crate' ? buildCrate(def, rnd)
      : buildShelf(def, rnd);
  const group = new THREE.Group();
  const mats = [];
  for (const part of parts) {
    const mat = furnitureMaterial(part.mat);
    mats.push(mat);
    group.add(new THREE.Mesh(part.geo, mat));
  }
  group.position.set(item.x, 0, item.z);
  group.rotation.y = item.rotY;
  group.scale.setScalar(item.scale);
  applyShade(mats, item.shade);
  scene.add(group);
  group.traverse((o) => { o.updateMatrix(); o.matrixAutoUpdate = false; });
  group.updateMatrixWorld(true);
  const record = { item, group, mats };
  furnitureRecords.push(record);
  return record;
}
function removeFurnitureItem(record) {
  const at = furnitureRecords.indexOf(record);
  if (at >= 0) furnitureRecords.splice(at, 1);
  const li = archiveLayout.items.indexOf(record.item);
  if (li >= 0) archiveLayout.items.splice(li, 1);
  scene.remove(record.group);
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
  ],
};
const savedLayout = globalThis.DEAD_LETTER_OFFICE_LAYOUT;
const archiveLayout = (savedLayout && savedLayout.kind === 'furniture'
  && Array.isArray(savedLayout.items)) ? savedLayout : DLO_DEFAULT_LAYOUT;
for (const item of archiveLayout.items) buildFurnitureItem(item);

// cabinet-top strays keep the radio company (surface clutter, not floor layout)
{
  const rnd = mulberry32(77);
  for (const [sx, sz, n, ry] of [[8.45, -1.6, 2, 0.5], [7.95, -2.2, 1, -0.4]]) {
    const geos = [];
    for (let i = 0; i < n; i++) {
      const g = archiveBoxGeo(rnd);
      const m = new THREE.Matrix4().makeRotationY(ry + (rnd() - 0.5) * 0.35);
      m.setPosition(sx, 1.32 + 0.005 + BOX_H / 2 + i * (BOX_H + 0.008), sz);
      g.applyMatrix4(m);
      geos.push(g);
    }
    const mesh = new THREE.Mesh(mergeGeometries(geos), matBoxAtlas);
    mesh.updateMatrix();
    mesh.matrixAutoUpdate = false;
    scene.add(mesh);
  }
}

/* ================= tables: donut service + the big door table ================ */

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

// shared parcel look: brown paper + twine cross
const texParcel = canvasBase(128, (g, px) => {
  g.fillStyle = '#a58a62'; g.fillRect(0, 0, px, px);
  g.fillStyle = 'rgba(122,98,64,0.5)';
  g.fillRect(px * 0.44, 0, px * 0.12, px);
  g.fillRect(0, px * 0.44, px, px * 0.12);
});
const matParcel = new THREE.MeshLambertMaterial({ map: texParcel });
function parcel(x, y, z, w, h, d, ry) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), matParcel);
  m.position.set(x, y + h / 2, z);
  m.rotation.y = ry;
  scene.add(m);
}

// the donut table — coffee service, a box of donuts, his lunchbox (by the desk)
{
  const h = mkTable(0.5, -5.05, 1.15, 0.62, 0.78, 0);
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.05, 14), matIron);
  plate.position.set(0.12, h + 0.025, -5.1);
  scene.add(plate);
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.105, 0.19, 14),
    new THREE.MeshStandardMaterial({ color: 0x2a1c10, roughness: 0.25, transparent: true, opacity: 0.85 }));
  pot.position.set(0.12, h + 0.145, -5.1);
  scene.add(pot);
  const cupMat = new THREE.MeshStandardMaterial({ color: 0xd8d2c4, roughness: 0.6 });
  for (let i = 0; i < 3; i++) {
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.07, 10), cupMat);
    cup.position.set(0.38, h + 0.035 + i * 0.072, -5.14);
    scene.add(cup);
  }
  // donut box: open cardboard lid + six donuts
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.05, 0.3), matParcel);
  box.position.set(0.78, h + 0.025, -5.0);
  box.rotation.y = 0.15;
  scene.add(box);
  // (the propped-open cardboard lid is gone — James r12.3: it read as a stray
  // box balancing on its side behind the donuts)
  const icings = [0xc98a9a, 0x8a5a38, 0xd8c9a0, 0xc98a9a, 0x8a5a38, 0xd8c9a0];
  for (let i = 0; i < 6; i++) {
    const donut = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.02, 8, 14),
      new THREE.MeshStandardMaterial({ color: icings[i], roughness: 0.8 }));
    donut.position.set(0.66 + (i % 3) * 0.115, h + 0.065, -5.06 + Math.floor(i / 3) * 0.11);
    donut.rotation.set(Math.PI / 2 + 0.1, 0, i);
    scene.add(donut);
  }
  // lunchbox: dented green metal, latch, handle
  const lunch = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.16, 0.14),
    new THREE.MeshStandardMaterial({ color: 0x3e5a48, roughness: 0.5, metalness: 0.5 }));
  lunch.position.set(0.16, h + 0.08, -4.85);
  lunch.rotation.y = -0.3;
  scene.add(lunch);
  const lunchHandle = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.009, 6, 12, Math.PI), matIron);
  lunchHandle.position.set(0.16, h + 0.16, -4.85);
  lunchHandle.rotation.set(0, -0.3, 0);
  scene.add(lunchHandle);
}

// the big table by the stairwell door — outgoing that never goes
{
  const h = mkTable(-8.25, 4.4, 0.78, 1.55, 0.85, 0);
  // parcel scale: platform, column, big round dial
  const scaleBase = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, 0.3), matIron);
  scaleBase.position.set(-8.3, h + 0.025, 3.85);
  scene.add(scaleBase);
  const scaleCol = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 8), matIron);
  scaleCol.position.set(-8.3, h + 0.2, 3.72);
  scene.add(scaleCol);
  const dial = addSign(signTexture(128, 128, (g) => {
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
  }), 0.2, 0.2, -8.3, h + 0.42, 3.72, Math.PI / 2);
  dial.rotation.z = 0.04;
  parcel(-8.3, h, 4.45, 0.3, 0.18, 0.24, 0.2);
  parcel(-8.28, h + 0.18, 4.45, 0.24, 0.14, 0.2, -0.25);
  parcel(-8.2, h, 4.95, 0.34, 0.22, 0.26, 0.5);
  const twine = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0xc9b98a, roughness: 0.98 }));
  twine.position.set(-8.42, h + 0.07, 4.18);
  scene.add(twine);
  const ledger = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, 0.42),
    new THREE.MeshStandardMaterial({ color: 0x5a3a2a, roughness: 0.7 }));
  ledger.position.set(-8.15, h + 0.025, 5.05);
  ledger.rotation.y = -0.2;
  scene.add(ledger);
  const ink = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.07, 10),
    new THREE.MeshStandardMaterial({ color: 0x1a2438, roughness: 0.3 }));
  ink.position.set(-8.45, h + 0.035, 4.75);
  scene.add(ink);
}

// the couch corner (r12.1, James): a low coffee table in front of the couch,
// small plant on it, two beat-up chairs flanking — the office's break nook.
// The chairs reuse chair.glb via PROPS below; camera keep-out is one box in
// STATIC_BOXES and the couch nav edge routes around it through H8.
mkTable(-5.2, -4.3, 1.1, 0.5, 0.42, 0.05);
parcel(8.55, 1.32, -3.6, 0.4, 0.26, 0.34, 0.3);     // on the file bank
parcel(8.5, 1.32, -3.1, 0.32, 0.2, 0.28, -0.4);
parcel(8.52, 1.58, -3.45, 0.26, 0.18, 0.24, 0.8);   // stacked
parcel(3.9, 0, -5.5, 0.5, 0.36, 0.42, 0.25);        // floor, by the pigeonholes
parcel(3.95, 0.36, -5.45, 0.4, 0.28, 0.34, -0.3);
parcel(-6.4, 0, 5.35, 0.55, 0.4, 0.45, 0.4);        // southwest corner drift
parcel(-6.35, 0.4, 5.3, 0.42, 0.3, 0.36, -0.2);
parcel(-5.9, 0, 5.55, 0.38, 0.26, 0.32, 0.9);

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
};

const drawnArtTexCache = new Map();
function wallArtMaterial(type) {
  const def = WALL_ART[type];
  let tex;
  if (def.img) {
    tex = posterLoader.load(`assets/posters/${def.img}`);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = maxAniso;
  } else {
    if (!drawnArtTexCache.has(type)) {
      drawnArtTexCache.set(type, signTexture(256, Math.round(256 * def.h / def.w), (g, w, h) => {
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
  const hM = def.img ? def.w * def.aspect : def.h;
  const mat = wallArtMaterial(item.type);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(def.w, hM), mat);
  const rnd = mulberry32((item.seed ?? 1) * 2654435761 >>> 0 || 1);
  mesh.rotation.z = (rnd() - 0.5) * 0.05;             // pinned slightly askew
  const group = new THREE.Group();
  group.add(mesh);
  group.position.set(item.x, item.y ?? 2.0, item.z);
  group.rotation.y = item.rotY;
  group.scale.setScalar(item.scale);
  applyShade([mat], item.shade);
  scene.add(group);
  group.traverse((o) => { o.updateMatrix(); o.matrixAutoUpdate = false; });
  group.updateMatrixWorld(true);
  const record = { item, group, mats: [mat], art: true };
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
];
if (!archiveLayout.items.some((i) => WALL_ART[i.type])) {
  archiveLayout.items.push(...DLO_DEFAULT_ART);
}
for (const item of archiveLayout.items) buildArtItem(item);

// west wall: the corkboard with the little stickers (he consults it)
addSign(signTexture(512, 400, (g, w, h) => {
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
}), 1.05, 0.82, ROOM.x0 + 0.03, 1.72, 0.2, Math.PI / 2);

// (South-side clutter history: the r1 crates/mail-cart/sacks block lived here.
// The cart + sphere sacks were cut 2026-07-27 on James's screenshot verdict;
// the crates became arrange-mode layout items the same night — see the archive
// stacks section. If a mail cart ever returns it gets built properly.)

/* ================= the rug ================= */

{
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
      g.fillStyle = `rgba(200,180,150,${0.04 + Math.random() * 0.05})`;
      g.beginPath();
      g.ellipse(Math.random() * w, Math.random() * h, 14 + Math.random() * 30, 6 + Math.random() * 14,
        Math.random() * Math.PI, 0, Math.PI * 2);
      g.fill();
    }
  });
  // bigger and moved (2026-07-28, James): it runs under the desk and sticks out
  // in front of it, with the chair sitting on it too
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 3.2),
    new THREE.MeshLambertMaterial({ map: texRug }));
  rug.rotation.x = -Math.PI / 2;
  rug.rotation.z = 0.02;
  rug.position.set(2.7, 0.006, -4.3);
  scene.add(rug);
}

/* ================= the welcome mat (r12.1, James) ================= */

{
  const texMat = signTexture(384, 224, (g, w, h) => {
    g.fillStyle = '#6e5b3e'; g.fillRect(0, 0, w, h);       // coir
    for (let k = 0; k < 2600; k++) {                        // bristle noise
      g.fillStyle = `rgba(${70 + Math.random() * 60},${55 + Math.random() * 45},${28 + Math.random() * 26},0.5)`;
      g.fillRect(Math.random() * w, Math.random() * h, 2, 1);
    }
    g.strokeStyle = '#3e3322'; g.lineWidth = 14; g.strokeRect(9, 9, w - 18, h - 18);
    g.fillStyle = 'rgba(40,32,20,0.82)';
    g.font = '700 58px Georgia, "Times New Roman", serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('WELCOME', w / 2, h / 2 + 2);
    for (let k = 0; k < 26; k++) {                          // worn-through patches
      g.fillStyle = 'rgba(110,91,62,0.5)';
      g.beginPath();
      g.ellipse(Math.random() * w, Math.random() * h,
        6 + Math.random() * 22, 3 + Math.random() * 8, Math.random() * Math.PI, 0, Math.PI * 2);
      g.fill();
    }
  });
  const mat = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.55),
    new THREE.MeshLambertMaterial({ map: texMat }));
  mat.rotation.x = -Math.PI / 2;
  mat.rotation.z = Math.PI / 2 + 0.03;   // reads for whoever comes down the stairs
  mat.position.set(ROOM.x0 + 0.62, 0.007, 2.6);
  scene.add(mat);
}

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
  prop_desk: () => propTex(WOOD_TILE, { color: 0xb59a78 }),
  prop_chair: () => propTex(WOOD_TILE, { color: 0xa88a68 }),
  prop_basket: () => new THREE.MeshStandardMaterial({ color: 0x5a5c58, roughness: 0.45, metalness: 0.8 }),
  prop_furnace: () => new THREE.MeshStandardMaterial({ color: 0x232120, roughness: 0.6, metalness: 0.55 }),
  prop_plant_leaf: () => new THREE.MeshStandardMaterial({ color: 0x5a6b3a, roughness: 0.9 }),
  prop_plant_pot: () => new THREE.MeshStandardMaterial({ color: 0x9a5a38, roughness: 0.85 }),
  prop_couch: () => new THREE.MeshLambertMaterial({ color: 0x6b7052 }),   // tired olive
};

let basketRimY = 1.1;           // refined from the basket bbox on load
let deskSurfaceY = 0.76;        // refined by raycast on load
const raycaster = new THREE.Raycaster();

const PROPS = [
  {
    // r12.3 (James): pushed back until its rear edge is ~1 inch off the north
    // wall (depth 0.78m → center z −5.585). Chair + every desk item shifted
    // the same Δ=0.585 so the arrangement holds.
    file: 'assets/props/desk.glb', height: 1.42, pos: [2.5, 0, -5.585], rotY: 0,
    then(wrap) {
      // find the writing surface by dropping a ray at the front-left of the top
      wrap.updateMatrixWorld(true);
      raycaster.set(new THREE.Vector3(2.15, 2.4, -5.265), new THREE.Vector3(0, -1, 0));
      const hit = raycaster.intersectObject(wrap, true)[0];
      if (hit) deskSurfaceY = hit.point.y;
      dressDesk();
    },
  },
  { file: 'assets/props/chair.glb', height: 0.98, pos: [3.6, 0, -4.835], rotY: 2.7 },
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
  { file: 'assets/props/plant.glb', height: 0.62, pos: [8.55, cabinetTopY, -1.02], rotY: 0.6 },
  // two more plants (2026-07-22, James): "a little brown and a little sad, but
  // okay generally" — same mesh, browner tints, different scales/turns
  { file: 'assets/props/plant.glb', height: 0.5, pos: [8.62, 1.9, 0.72], rotY: 1.8, tint: 0xd8b088 },
  // the beat-up couch (2026-07-22, Meshy preview 5cr): north wall, aimed square
  // at the basket so he can sit and watch the letters fall
  { file: 'assets/props/couch.glb', height: 0.8, pos: [-5.0, 0, -5.5], rotY: 0 },
  { file: 'assets/props/plant.glb', height: 0.72, pos: [-3.5, 0, -5.25], rotY: 3.6, tint: 0xc9a070 },
  // the couch corner set (r12.1): small plant on the coffee table, two beat-up
  // chairs angled in at the table (worn grey-brown tints, r12.1)
  { file: 'assets/props/plant.glb', height: 0.3, pos: [-5.2, 0.42, -4.3], rotY: 1.9, tint: 0xd0b088 },
  { file: 'assets/props/chair.glb', height: 0.96, pos: [-6.35, 0, -4.35], rotY: 0.16, tint: 0x9a8878 },
  { file: 'assets/props/chair.glb', height: 0.94, pos: [-4.0, 0, -4.25], rotY: 3.2, tint: 0x8a7868 },
  // the AM radio (2026-07-27, Meshy refine 30cr, James's ask): a 1950s bakelite
  // set on the cabinet bank, angled at the room. Keeps its own Meshy textures —
  // no material name starts with prop_, so the swap loop passes it by. Clicking
  // it toggles the music (wired in the sound section).
  {
    file: 'assets/props/radio.glb', height: 0.3, pos: [8.2, 1.32, -3.55], rotY: -1.16,
    then(wrap) {
      wrap.traverse((o) => {
        if (!o.isMesh) return;
        propClickables.radio.add(o);
        if (o.material && o.material.emissiveMap) {
          // Meshy dual-atlas: keep the emissive copy ON faintly (the r4 pmGlow
          // lesson — it must read in a dim corner); brightens while playing
          o.material.emissiveIntensity = radioOn ? 0.42 : 0.22;
          radioGlowMats.push(o.material);
        }
      });
      hoverDirty = true;
    },
  },
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
    if (posterNote) posterNote.textContent = `setting the room… ${propsLoaded}/${PROPS.length + 1}`;
  }, undefined, () => console.warn('[dlo] prop failed to load:', spec.file));
}

// desk dressing: banker's lamp, mug, nameplate, papers — placed on the surface
// found by raycast, so nothing floats or sinks
function dressDesk() {
  const y = deskSurfaceY;
  const brass = new THREE.MeshStandardMaterial({ color: 0x9a8446, roughness: 0.3, metalness: 0.9 });
  const lamp = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.03, 12), brass);
  base.position.y = 0.015;                 // sit ON the surface, not half in it
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.3, 8), brass);
  stem.position.y = 0.16;
  stem.rotation.z = 0.28;
  const shade = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({
      color: 0x1d4a2a, roughness: 0.3, metalness: 0.2,
      emissive: 0x2a6b30, emissiveIntensity: 0.7, side: THREE.DoubleSide,
    }));
  shade.position.set(-0.06, 0.31, 0);
  shade.scale.set(1, 0.72, 0.62);
  const glowDisc = new THREE.Mesh(new THREE.CircleGeometry(0.11, 12),
    new THREE.MeshBasicMaterial({ color: 0xd8ffb0 }));
  glowDisc.rotation.x = Math.PI / 2;
  glowDisc.position.set(-0.06, 0.29, 0);
  lamp.add(base, stem, shade, glowDisc);
  // moved back toward the desk's rear edge (r12.1 — it half-clipped the desk)
  lamp.position.set(2.12, y, -5.445);
  lamp.rotation.y = 0.5;
  scene.add(lamp);
  lampLight.position.set(2.09, y + 0.28, -5.445);

  // the coffee mug: a real Meshy prop now (r12.1, James's ask), ceramic in-engine
  loader.load('assets/props/mug.glb', (gltf) => {
    const src = gltf.scene;
    src.traverse((o) => {
      if (o.isMesh) {
        o.material = new THREE.MeshStandardMaterial({ color: 0xd8d0be, roughness: 0.55 });
      }
    });
    const box = new THREE.Box3().setFromObject(src);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const wrap = new THREE.Group();
    src.position.set(-center.x, -box.min.y, -center.z);
    wrap.add(src);
    wrap.scale.setScalar(0.105 / size.y);
    wrap.position.set(2.92, y, -5.24);
    wrap.rotation.y = -0.75;               // handle toward his chair
    scene.add(wrap);
  }, undefined, () => console.warn('[dlo] mug failed to load'));

  // the postmaster's sign, on the wall above the desk now (r12.2, James) —
  // twice the old plate, and he finally has a name
  addSign(signTexture(640, 180, (g, w, h) => {
    g.fillStyle = '#211d16'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#9a8446'; g.lineWidth = 8; g.strokeRect(7, 7, w - 14, h - 14);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#b09a64';
    g.font = '700 56px "Courier New", monospace';
    g.fillText('POSTMASTER', w / 2, 54);
    g.fillStyle = '#d8bd85';
    g.font = '700 74px "Courier New", monospace';
    g.fillText('JOHN DOUGH', w / 2, 128);
  }), 0.88, 0.25, 2.5, 1.8, ROOM.z0 + 0.02, 0);

  // paper reams: one proper stack now — squared-ish, each ream a little askew
  let reamY = y;
  for (let i = 0; i < 3; i++) {
    const th = 0.045;
    const papers = new THREE.Mesh(new THREE.BoxGeometry(0.24, th, 0.32), matPaper);
    papers.position.set(
      2.66 + (Math.random() - 0.5) * 0.03,
      reamY + th / 2,
      -5.305 + (Math.random() - 0.5) * 0.03);
    papers.rotation.y = (Math.random() - 0.5) * 0.22;
    scene.add(papers);
    reamY += th;
  }
  // RETURN TO SENDER TO NOWHERE — paper sign pinned to the desk's room side
  const rts = addSign(signTexture(256, 300, (g, w, h) => {
    g.fillStyle = '#cfc2a0'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#3a3226';
    g.font = '700 44px "Courier New", monospace';
    g.textAlign = 'center';
    ['RETURN', 'TO', 'SENDER', 'TO', 'NOWHERE'].forEach((t, i) => g.fillText(t, w / 2, 56 + i * 52));
  }), 0.3, 0.36, 2.86, 0.62, -5.17, Math.PI);
  rts.rotation.z = 0.04;
}

/* ================= the postmaster ================= */

const IDLES = ['idle-1', 'idle-2', 'idle-3'];
const STILL = 0.0001;   // never exactly 0 — the mixer stops rewriting bones

const pmGroup = new THREE.Group();
scene.add(pmGroup);
let pmModel = null, mixer = null, headBone = null, handBone = null, pmProxy = null;
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

Promise.all([
  loader.loadAsync('assets/postmaster/postmaster.glb'),
  loader.loadAsync('assets/postmaster/anim-pack.glb'),
]).then(([modelGltf, packGltf]) => {
  pmModel = modelGltf.scene;
  const bbox = new THREE.Box3().setFromObject(pmModel);
  const size = bbox.getSize(new THREE.Vector3());
  // 1.70 read small against the furniture (James r5), then +4in more (r7)
  const PM_HEIGHT = 1.89;
  const scale = PM_HEIGHT / size.y;
  pmModel.scale.setScalar(scale);
  pmModel.position.y = -bbox.min.y * scale;
  pmModel.traverse((o) => {
    if (!o.isMesh || !o.material) return;
    // Meshy dual atlas, now on purpose (James r4: "just lighten him up so I can
    // always see him"): the emissive copy stays at PARTIAL strength — he glows
    // with his own colors so the face reads in any corner, and the room's real
    // light still layers on top. pmGlow in the tuner is the knob.
    if (o.material.emissive) o.material.emissive.set(0xffffff);
    o.material.emissiveIntensity = tune.pmGlow;
    o.material.roughness = 0.85;
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
  headBone = pmModel.getObjectByName('Head');
  handBone = pmModel.getObjectByName('RightHand');

  mixer = new THREE.AnimationMixer(pmModel);
  for (const clip of packGltf.animations) {
    if (clip.name.includes('|')) continue;   // stray unnamed export
    actions[clip.name] = mixer.clipAction(clip);
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

  pmGroup.position.set(PM_STATIONS.desk.x, 0, PM_STATIONS.desk.z);
  pmYaw = PM_STATIONS.desk.face;
  pmGroup.rotation.y = pmYaw;
  hoverDirty = true;   // he just joined the click targets
  if (reducedMotion) {
    playBase('idle-2', 0.35, STILL);
  } else {
    playBase(pickIdle());
    pmScheduleNext(6);
  }
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
  desk:      { x: 2.5, z: -4.74, face: Math.PI },   // works at the desk, back to the room
  basket:    { x: -3.3, z: -0.6, face: -2.21 },
  furnace:   { x: 5.7, z: 2.6, face: 0.885 },
  clock:     { x: -7.9, z: 1.2, face: -Math.PI / 2 },
  coffee:    { x: 0.5, z: -4.25, face: Math.PI },   // the donut table by his desk
  window:    { x: -7.8, z: -2.9, face: -0.93 },
  pigeon:    { x: 5.6, z: -4.5, face: Math.PI },
  corkboard: { x: -8.05, z: 0.2, face: -Math.PI / 2 },
  cabinets:  { x: 6.9, z: -2.0, face: Math.PI / 2 },
  doorSt:    { x: -8.1, z: 2.6, face: -Math.PI / 2 },
  couch:     { x: -5.0, z: -4.9, face: 0 },          // seat edge, facing the basket
  wander1:   { x: 0, z: 1.5, face: 0 },
  wander2:   { x: -1.5, z: -2.5, face: Math.PI },
  wander3:   { x: 3.5, z: 1.8, face: 0.4 },
};

const NAV_NODES = {
  H1: { x: 0, z: 0.8 },
  H2: { x: -4.0, z: 1.2 },
  H3: { x: 4.6, z: 0.6 },
  H4: { x: -6.8, z: 2.2 },
  H5: { x: 4.9, z: 3.4 },
  H7: { x: 4.35, z: -3.6 },
  H8: { x: -3.0, z: -4.9 },   // couch approach lane, south of the coffee table
  ...PM_STATIONS,
};
const NAV_EDGES = [
  ['desk', 'H7'], ['H7', 'H3'], ['H7', 'pigeon'],
  ['H3', 'H1'], ['H3', 'H5'], ['H3', 'furnace'], ['H3', 'wander3'], ['H3', 'cabinets'],
  ['H5', 'furnace'],
  ['H1', 'H2'], ['H1', 'wander1'], ['H1', 'wander2'], ['H1', 'basket'], ['H1', 'coffee'],
  ['desk', 'coffee'],
  ['H2', 'basket'], ['H2', 'H4'], ['H2', 'window'],
  ['H4', 'clock'], ['H4', 'window'], ['H4', 'corkboard'], ['H4', 'doorSt'],
  ['wander2', 'H8'], ['H8', 'couch'],   // around the coffee-table nook (r12.1)
];
const NAV_ADJ = {};
for (const [a, b] of NAV_EDGES) {
  (NAV_ADJ[a] = NAV_ADJ[a] || []).push(b);
  (NAV_ADJ[b] = NAV_ADJ[b] || []).push(a);
}

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
  playBase('walk', 0.3, tune.walk / 0.9);
}
let pmArrived = null;

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
  // an in-place work branch) — walking to your own feet was the treadmill bug
  const options = PM_ROUTINES.filter((r) =>
    r.key === 'deskwork' || !r.station || r.station !== pmStationKey);
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
        const burn = Math.random() < 0.45;
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
  pmState = 'busy';
  pmSpeakFrom(PM_FILE_LINES);
  const slot = pigeonholeSlots[Math.floor(Math.random() * pigeonholeSlots.length)];
  setTimeout(() => {
    if (pmCarried) tossEnvelope(pmCarried, slot.clone(), () => playSfx(sfxFlutter, 0.5));
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
    const step = tune.walk * dt;
    if (dist <= step * 1.5) {
      pmGroup.position.set(next.x, 0, next.z);
      pmPath.shift();
      if (!pmPath.length) {
        pmState = 'station';
        const st = PM_STATIONS[pmStationKey];
        if (st) pmFaceTarget = st.face;
        playBase(pickIdle());
        const cb = pmArrived;
        pmArrived = null;
        if (cb) cb();
      }
    } else {
      pmGroup.position.x += (dx / dist) * step;
      pmGroup.position.z += (dz / dist) * step;
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
    pmYaw += dYaw * Math.min(1, dt * 4);
  }
  pmGroup.rotation.y = pmYaw;

  if (pmState === 'station' && now >= pmNextAt) {
    pmNextAt = Infinity;
    pmRoutine();
  }

  // carried things ride the right hand
  if (pmCarried && handBone) {
    handBone.getWorldPosition(pmCarried.position);
    pmCarried.position.y += 0.02;
    pmCarried.rotation.set(-0.4, pmYaw, 0.2);
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
  window.clearTimeout(bubbleTimer);
  bubbleEl.textContent = line;
  bubbleEl.hidden = false;
  bubbleUntil = performance.now() + Math.max(3800, line.length * 70);
  bubbleTimer = window.setTimeout(() => { bubbleEl.hidden = true; }, Math.max(3800, line.length * 70));
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
  if (letterOpen || pmAway) { nextAmbientAt = now + 8000; return; }
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

function postmasterClicked() {
  if (pmAway) return;   // he is upstairs; the click hits nothing that answers
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
// onto the floor around it. Only the top layer (and floor spill) is clickable.
const PILE = {
  baseY: 0.1,
  layerH: 0.045,
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
    return 0.26 + 0.32 * (layerIdx / rim);
  }
  return Math.max(0.16, 0.5 - 0.06 * (layerIdx - rim));   // the mound above
}
function pileLayerCap(layerIdx) {
  const r = pileRadius(layerIdx);
  return Math.max(2, Math.round((r / 0.58) * (r / 0.58) * 8));
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
function setLayerClickable(layerIdx, on) {
  const layer = PILE.layers[layerIdx];
  if (!layer) return;
  for (const group of layer) {
    for (const child of group.children) {
      const i = envClickables.indexOf(child);
      if (on && i === -1) envClickables.push(child);
      if (!on && i !== -1) envClickables.splice(i, 1);
    }
  }
  hoverDirty = true;
}
function placeInPile(group) {
  let L = pileTopLayer();
  if (L < 0) L = 0;
  if (PILE.layers[L] && PILE.layers[L].length >= pileLayerCap(L)) L += 1;
  while (PILE.layers.length <= L) PILE.layers.push([]);
  if (PILE.layers[L].length === 0 && L > 0) setLayerClickable(L - 1, false);
  const r = Math.sqrt(Math.random()) * pileRadius(L);
  const a = Math.random() * Math.PI * 2;
  group.position.set(
    BASKET_POS.x + Math.cos(a) * r,
    PILE.baseY + L * PILE.layerH,
    BASKET_POS.z + Math.sin(a) * r * 0.85);
  group.rotation.set(-Math.PI / 2 + (Math.random() - 0.5) * 0.3,
    Math.random() * Math.PI * 2, (Math.random() - 0.5) * 0.2);
  group.userData.pileLayer = L;
  PILE.layers[L].push(group);
  PILE.resident += 1;
  basketPile.push(group);
  // settled letters are static: freeze the matrix so hundreds of pile residents
  // stop recomposing transforms every frame (r3 perf pass)
  group.updateMatrix();
  group.matrixAutoUpdate = false;
  if (PILE.resident > PILE_CAP) {          // recycle the buried bottom, invisibly
    for (const layer of PILE.layers) {
      if (layer.length && layer !== PILE.layers[pileTopLayer()]) {
        const old = layer.shift();
        removeEnvelopeGroup(old);
        break;
      }
    }
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
  bumpDeadLetters();
  playSfx(sfxFlutter, 0.35);
  if (Math.random() < spillChance()) {
    // the mound is past the rim: this one slides off onto the floor
    const a = Math.random() * Math.PI * 2;
    const target = new THREE.Vector3(
      BASKET_POS.x + Math.cos(a) * (0.9 + Math.random() * 0.6),
      0.015,
      BASKET_POS.z + Math.sin(a) * (0.75 + Math.random() * 0.55));
    slideEnvelope(f.group, target, () => {
      f.group.rotation.set(-Math.PI / 2, Math.random() * Math.PI * 2, 0);
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
  if (PILE.layers[L].length === 0 && L > 0) setLayerClickable(L - 1, true);
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
    group.rotation.set(-Math.PI / 2, Math.random() * Math.PI * 2, 0);
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
const sfxFlutter = new Audio('assets/audio/letter-flutter.mp3');
const sfxSip = new Audio('assets/audio/coffee-sip.mp3');
for (const a of [sfxThunk, sfxWhoosh, sfxPunch, sfxFlutter, sfxSip]) a.preload = 'auto';

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
// Break format (James): song ends → DJ signs it off (odd dj) → two ads →
// DJ intros the next number (even dj) → song. dj8 loops the set.
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
  { src: 'assets/radio-music/dj8-radio.mp3' },
];
const RADIO_SONG_STARTS = RADIO_PROGRAM
  .map((item, i) => (item.song ? i : -1)).filter((i) => i >= 0);
const RADIO_POS = new THREE.Vector3(8.2, 1.5, -3.55);
const RADIO_LEVEL = 0.9;
const radioGlowMats = [];
const radioAudio = new Audio();
radioAudio.preload = 'auto';
let radioOn = true;                 // the office radio plays unless someone turns it off
let radioVol = 0.7;
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
// Wall-side faces extend ≥2m past the wall so the least-penetration push always
// resolves into the room (a face just past the wall loses to the wall clamp and
// traps the camera — the fuzz sim caught it).
const STATIC_BOXES = [
  [-0.15, 4.0, -8.0, -4.75],               // desk + donut table + tucked chair (desk
                                           // at the wall r12.3; east face buried in
                                           // the pigeonhole box on purpose)
  [4.45, 9.5, -8.0, -5.05],                // pigeonholes + coat-rack corner
  [7.45, 11.5, -5.15, 0.15],               // file cabinet bank (overlaps the
                                           // pigeonhole box so no sliver opens)
  [-11.5, -8.05, -2.8, -1.2],              // radiator
  [-11.5, -7.55, 3.6, 5.2],                // big table by the door
  [-6.1, -3.9, -8.0, -5.2],                // the couch (box face sits behind the
                                           // cushion so his sit station clears it)
  [8.2, 11.5, 0.05, 1.9],                  // bookshelf (overlaps the cabinet bank)
  [-6.65, -3.7, -4.65, -3.95],             // coffee table + flanking chairs (the
                                           // couch nook; north face buried in the
                                           // couch box on purpose — no sliver)
];

// Arrange-mode furniture derives its keep-out from the item footprint: rotated
// rect → AABB + body margin; faces near a wall extend well past it (the r2
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
  BOXES = [...STATIC_BOXES, ...mergeItemBoxes(
    archiveLayout.items.filter((i) => FURNITURE[i.type]).map(itemKeepOut))];
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

const pos = new THREE.Vector3(0, EYE, 4.9);
let yaw = 0, pitch = 0, tYaw = 0, tPitch = 0;   // yaw 0 faces -z: the office
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
const TOP_SPEED = 3.0;   // motion-sickness cap: stacked wheel dollies obey it too
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
  ['pmGlow', 0.0, 1.0, 0.02],
  ['ambient', 0.2, 1.8, 0.05], ['fluor', 0.0, 3.5, 0.05],
  ['bulb', 0.4, 3.0, 0.05], ['lamp', 0.0, 4.0, 0.05],
  ['furnace', 0.0, 3.0, 0.05], ['shaft', 0.0, 0.5, 0.01],
  ['fog', 0.0, 0.08, 0.002], ['mailEvery', 2, 15, 0.5],
  ['fallSpeed', 0.15, 1.2, 0.05], ['pace', 0.4, 2.5, 0.05],
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
  panel.innerHTML = '<div class="grid"></div>' +
    '<div class="foot"><span>values:</span><input readonly><button type="button">reset</button></div>';
  document.body.appendChild(panel);
  const grid = panel.querySelector('.grid');
  const jsonOut = panel.querySelector('.foot input');
  const resetBtn = panel.querySelector('.foot button');
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
      localStorage.setItem('dlo-room-tuner-v2', JSON.stringify(tune));
      refresh();
    });
    row.append(label, range, out);
    grid.appendChild(row);
    vals[key] = { range, out };
  }
  resetBtn.addEventListener('click', () => {
    tune = { ...TUNE_DEFAULTS };
    localStorage.removeItem('dlo-room-tuner-v2');
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
  shaftMat.opacity = tune.shaft;
  lampLight.intensity = tune.lamp;
  hemi.intensity = tune.ambient;
  for (const l of bulbLights) l.intensity = tune.bulb;
  for (const l of fluorLights) l.intensity = tune.fluor;
  for (const m of pmMats) m.emissiveIntensity = tune.pmGlow;
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
  pmTick(dt, now);
  mailTick(dt, now);
  bubbleTick();

  // furnace flicker + flare decay
  if (!reducedMotion) {
    const flick = Math.sin(t * 11.3) * 0.12 + Math.sin(t * 23.7) * 0.08;
    furnaceFlare = Math.max(0, furnaceFlare - dt * 0.8);
    furnaceLight.intensity = tune.furnace * (1 + flick) + furnaceFlare * 5.5;
    if (punchFlash > 0) punchFlash -= dt;
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
  if (wish.lengthSq() > 0) wish.normalize().multiplyScalar(2.2);
  if (Math.abs(dollyImpulse) > 0.01) {
    wish.addScaledVector(fwd, dollyImpulse * 2.2);
    dollyImpulse *= Math.pow(0.0025, dt);
  }
  if (wish.length() > TOP_SPEED) wish.setLength(TOP_SPEED);
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
  })).catch((err) => console.warn('[dlo] arrange mode failed to load:', err));
}
