// Tips & shortcuts: one sheet per mode, opened from the footer (or ? on a keyboard).
// Tips: one sheet for the current mode, opened from the footer (or ? on a keyboard); keyboard shortcuts are a section in it.
// Tips are [Greek, English]; keyboard rows are [[keys], Greek, English]. The keyboard part shows only on devices with a keyboard and mouse.
const HELP={
 calc:{tips:[
  ['Πάτα ένα αποτέλεσμα για να το αντιγράψεις.','Tap a result to copy it.'],
  ['Το ( ) ανοίγει ή κλείνει παρένθεση μόνο του. Όσες μείνουν ανοιχτές, τις κλείνει το =, και όσες δεν αλλάζουν τίποτα, όπως ((5)), φεύγουν.','( ) opens or closes a parenthesis on its own. Any left open are closed by =, and ones that change nothing, like ((5)), are removed.'],
  ['Κράτα πατημένο το − για να αλλάξεις πρόσημο (±), στον αριθμό που γράφεις ή στο αποτέλεσμα.','Hold − to change the sign (±) of the number you are typing, or of the result.'],
  ['Το f(x) πάνω αριστερά ανοίγει την επιστημονική αριθμομηχανή: sin, cos, tan, λογάριθμοι, δυνάμεις, ρίζες, π και e. Το 2nd δίνει τις αντίστροφες και το Deg/Rad αλλάζει μοίρες και ακτίνια.','f(x) at the top left opens the scientific calculator: sin, cos, tan, logarithms, powers, roots, π and e. 2nd gives the inverse functions and Deg/Rad switches between degrees and radians.'],
  ['Οι συναρτήσεις εφαρμόζονται στον αριθμό που μόλις έγραψες ή στο αποτέλεσμα: 30 και μετά sin δίνει sin(30). Χωρίς αριθμό ανοίγουν παρένθεση για ό,τι γράψεις μετά.','Functions apply to the number you just typed, or to the result: 30 then sin gives sin(30). With no number they open a bracket for what you type next.'],
  ['Για αρνητικό αριθμό μέσα στην πράξη, πάτα − αμέσως μετά από × ή ÷: το 2 × − 3 δίνει −6.','For a negative number inside a calculation, press − right after × or ÷: 2 × − 3 gives −6.'],
  ['Το 50 + 10% δίνει 55: το ποσοστό παίρνεται από τον προηγούμενο αριθμό. Το 50 × 10% δίνει 5.','50 + 10% gives 55: the percent is taken from the number before it. 50 × 10% gives 5.'],
  ['Πάτα ξανά = για να επαναλάβεις την τελευταία πράξη: το 2 + 3 = = δίνει 8.','Press = again to repeat the last operation: 2 + 3 = = gives 8.'],
  ['Το C σβήνει τον αριθμό που γράφεις. Όταν δεν γράφεις αριθμό γίνεται AC και τα σβήνει όλα, όπως και το ⌫ αν το κρατήσεις πατημένο.','C clears the number you are typing. When there is none it shows AC and clears everything, as does holding ⌫.'],
  ['Αλλάζοντας καρτέλα, αυτή που αφήνεις ξεκινά από την αρχή (οι υπολογισμοί μένουν στο Ιστορικό). Μόνο όταν πας στις Μονάδες, ο αριθμός που φαίνεται μεταφέρεται εκεί.','Changing tab starts the one you leave over (your calculations stay in History). Only going to Units takes the number on screen along.'],
  ['Ένας αριθμός έχει ως 15 ψηφία. Πολύ μεγάλα ή πολύ μικρά αποτελέσματα φαίνονται ως 1,234567 × 10²⁰. Πάνω από 10¹⁰⁰⁰⁰ η αριθμομηχανή γράφει «Πολύ μεγάλο».','A number has up to 15 digits. Very large or very small results show as 1,234567 × 10²⁰. Above 10¹⁰⁰⁰⁰ the calculator says "Too large".'],
  ['Αν μια πράξη δεν γίνεται, όπως 8 ÷ 0, φαίνεται ο λόγος και η πράξη μένει: διόρθωσέ την με ⌫ ή πάτα AC. Μια μεγάλη πράξη, σύρε την οθόνη για να δεις την αρχή της.','If a calculation can\'t be done, like 8 ÷ 0, the reason shows and the calculation stays: fix it with ⌫ or press AC. Swipe a long calculation on the display to see its start.'],
  ['Μετά από ένα αποτέλεσμα, το ? δείχνει βήμα βήμα πώς βγήκε. Στο Ιστορικό, πάτα έναν υπολογισμό για να τον ξαναφέρεις.','After a result, ? shows step by step how it was worked out. In History, tap a calculation to bring it back.']],
  keys:[[['0–9'],'Αριθμοί','Numbers'],[['+','−','×','÷'],'Πράξεις (και * /)','Operators (also * /)'],[[',','.'],'Υποδιαστολή','Decimal point'],[['(',')'],'Παρενθέσεις','Parentheses'],[['%'],'Ποσοστό','Percent'],[['^'],'Δύναμη','Power'],[['!'],'Παραγοντικό','Factorial'],[['F9'],'Αλλαγή προσήμου (±)','Change sign (±)'],[['Enter','='],'Αποτέλεσμα','Result'],[['Backspace'],'Σβήνει την επιλογή ή το ψηφίο πριν τον κέρσορα','Delete the selection, or the digit before the cursor'],[['−'],'Αλλάζει το πρόσημο','Change the sign'],[['Delete'],'Σβήνει τον αριθμό που γράφεις (C)','Clear the number you are typing (C)'],[['Esc'],'Καθαρίζει την πράξη (AC)','Clear the calculation (AC)'],[['Alt','1–9'],'Αλλαγή λειτουργίας','Switch mode'],[['?'],'Αυτές οι συμβουλές','These tips']]},
 units:{tips:[
  ['Πάτα την πάνω ή την κάτω τιμή για να γράψεις εκεί. Η άλλη μετατρέπεται αμέσως.','Tap the top or bottom value to type there. The other one converts right away.'],
  ['Μπορείς να κάνεις πράξεις μέσα στην τιμή, με παρενθέσεις και ποσοστά, π.χ. (12 + 8) × 2.','You can calculate inside a value, with parentheses and percentages, e.g. (12 + 8) × 2.'],
  ['Το ⇄ αλλάζει θέση στις δύο μονάδες.','⇄ swaps the two units.'],
  ['Από το μενού πάνω από τις τιμές διαλέγεις κατηγορία. Ο αριθμός μένει όταν αλλάζεις κατηγορία. Το Εμβαδόν έχει και στρέμματα.','The menu above the values picks the category. The number stays when you change category. Area includes the Greek stremma.'],
  ['Κράτα πατημένο το − για αλλαγή προσήμου (±).','Hold − to change the sign (±).'],
  ['Το C σβήνει τον αριθμό που γράφεις. Όταν δεν γράφεις αριθμό γίνεται AC και σβήνει και τις δύο τιμές, όπως και το ⌫ αν το κρατήσεις πατημένο.','C clears the number you are typing. When there is none it shows AC and clears both values, as does holding ⌫.'],
  ['Ένας αριθμός από την Αριθμομηχανή μπαίνει στην τιμή όπου έγραψες τελευταία, πάνω ή κάτω.','A number from the Calculator goes into the value you last typed in, top or bottom.']],
  keys:[[['0–9'],'Αριθμοί','Numbers'],[['+','−','×','÷'],'Πράξη μέσα στην τιμή','Math inside the value'],[['(',')'],'Παρενθέσεις','Parentheses'],[[',','.'],'Υποδιαστολή','Decimal point'],[['%'],'Ποσοστό','Percent'],[['F9'],'Αλλαγή προσήμου (±)','Change sign (±)'],[['Enter','='],'Ολοκλήρωση','Finish'],[['Backspace'],'Σβήνει την επιλογή ή το ψηφίο πριν τον κέρσορα','Delete the selection, or the digit before the cursor'],[['−'],'Αλλάζει το πρόσημο','Change the sign'],[['Delete'],'Σβήνει τον αριθμό που γράφεις (C)','Clear the number you are typing (C)'],[['Esc'],'Καθαρίζει τις τιμές (AC)','Clear both values (AC)'],[['Alt','1–9'],'Αλλαγή λειτουργίας','Switch mode'],[['?'],'Αυτές οι συμβουλές','These tips']]},
 graph:{tips:[
  ['Έως τρεις συναρτήσεις μαζί. Το + δίπλα στη συνάρτηση προσθέτει νέα.','Up to three functions at once. The + next to a function adds a new one.'],
  ['Σύρε το γράφημα για να το μετακινήσεις. Ζουμ με τη ροδέλα του ποντικιού, τα − + ή με δύο δάχτυλα.','Drag the graph to move it. Zoom with the mouse wheel, the − + buttons or two fingers.'],
  ['Οι τελείες δείχνουν ρίζες, ελάχιστα, μέγιστα και τομές. Πάτα μία για τις τιμές της ή το ? για λίστα.','The dots mark roots, minima, maxima and intersections. Tap one for its values, or ? for a list.'],
  ['Το ⤢ προσαρμόζει το ύψος στην καμπύλη, το ⌂ γυρίζει στην αρχή και το ⤓ το αποθηκεύει ως εικόνα.','⤢ fits the height to the curve, ⌂ goes back to the start and ⤓ saves it as an image.'],
  ['Το 2x σημαίνει 2 × x και το sin x σημαίνει sin(x). Οι γωνίες είναι σε ακτίνια.','2x means 2 × x and sin x means sin(x). Angles are in radians.']],
  keys:[[['x'],'Η μεταβλητή x','The variable x'],[['^'],'Δύναμη, π.χ. x^3','Power, e.g. x^3'],[['sin','sqrt','ln'],'Συναρτήσεις: γράψε το όνομα','Functions: type the name'],[['Enter'],'Επόμενη συνάρτηση','Next function'],[['↑','↓'],'Αλλαγή συνάρτησης','Switch function'],[['←','→'],'Μετακίνηση γραφήματος','Move the graph'],[['Backspace'],'Σβήνει την επιλογή ή το ψηφίο πριν τον κέρσορα','Delete the selection, or the digit before the cursor'],[['−'],'Αλλάζει το πρόσημο','Change the sign'],[['Esc'],'Καθαρίζει τη συνάρτηση','Clear the function'],[['Alt','1–9'],'Αλλαγή λειτουργίας','Switch mode'],[['?'],'Αυτές οι συμβουλές','These tips']]},
 vat:{tips:[
  ['«Πρόσθεσε ΦΠΑ»: από την καθαρή τιμή βρίσκεις την τελική. «Αφαίρεσε ΦΠΑ»: από την τελική βρίσκεις την καθαρή και τον ΦΠΑ που είχε.','“Add VAT”: from the net price you get the final price. “Remove VAT”: from the final price you get the net price and the VAT in it.'],
  ['Ο συντελεστής ξεκινά στο 24%. Άλλαξέ τον αν χρειάζεσαι άλλον.','The rate starts at 24%. Change it if you need another one.'],
  ['Ο ΦΠΑ στρογγυλεύεται σε λεπτά, όπως στα τιμολόγια, οπότε τα ποσά πάντα συμφωνούν.','VAT is rounded to cents, as on invoices, so the amounts always add up.'],
  ['Σύρε τον διακόπτη ή πάτα ← → πάνω του για να αλλάξεις πρόσθεση και αφαίρεση.','Slide the switch, or press ← → on it, to change between add and remove.'],
  ['Το ? δείχνει πώς βγήκε το ποσό και το κουμπί με τις στήλες το δείχνει σε διάγραμμα. Πάτα το αποτέλεσμα για να το αντιγράψεις.','? shows how the amount was worked out and the bars button shows it as a chart. Tap the result to copy it.']]},
 pct:{tips:[
  ['Τρία είδη στον διακόπτη: «Έκπτωση» δίνει την τελική τιμή, «Μεταβολή» πόσο τοις εκατό άλλαξε κάτι, «Φιλοδώρημα» πόσα πληρώνει ο καθένας.','Three kinds on the switch: “Discount” gives the final price, “Change” how much something changed in percent, “Tip” what each person pays.'],
  ['Μεταβολή: βάλε την παλιά τιμή στο «Από» και τη νέα στο «Σε». Π.χ. από 80 σε 100 είναι +25%.','Change: put the old value in “From” and the new one in “To”. From 80 to 100 is +25%, for example.'],
  ['Φιλοδώρημα: ξεκινά στο 10% για ένα άτομο. Όταν μοιράζεστε, το ποσό του καθενός στρογγυλεύεται προς τα πάνω στο λεπτό, ώστε να καλύπτεται ο λογαριασμός.','Tip: starts at 10% for one person. When you split, each share is rounded up to the cent so the bill is covered.'],
  ['Το ? δείχνει πώς βγήκε το αποτέλεσμα. Πάτα το αποτέλεσμα για να το αντιγράψεις. Το AC καθαρίζει μόνο το είδος που βλέπεις.','? shows how the result was worked out. Tap the result to copy it. AC clears only the kind on screen.']]},
 loan:{tips:[
  ['«Δόση»: βάλε ποσό δανείου, επιτόκιο και χρόνια για να δεις τη μηνιαία δόση και πόσους τόκους θα πληρώσεις συνολικά.','“Payment”: enter the loan amount, interest rate and years to see the monthly payment and how much interest you pay in all.'],
  ['«Διάρκεια»: πόσο καιρό θα πληρώνεις ένα δάνειο με τη δόση που αντέχεις, π.χ. 10.000 € με 300 € τον μήνα. Η τελευταία δόση είναι μικρότερη.','“Payoff time”: how long you will pay a loan with the payment you can afford, e.g. 10.000 € at 300 € a month. The last payment is smaller.'],
  ['«Αποταμίευση»: βάλε ό,τι έχεις ήδη, πόσα βάζεις κάθε μήνα, το επιτόκιο και τα χρόνια. Ένα από τα δύο ποσά αρκεί.','“Savings”: enter what you have now, what you add each month, the interest rate and the years. One of the two amounts is enough.'],
  ['Το επιτόκιο είναι ετήσιο και οι τόκοι υπολογίζονται κάθε μήνα, όπως στις τράπεζες. Τα χρόνια μπορούν να έχουν δεκαδικά: 2,5 είναι 30 μήνες.','The rate is yearly and interest is worked out every month, as banks do. Years can have decimals: 2,5 is 30 months.'],
  ['Το κουμπί με τις στήλες δείχνει δάνειο και τόκους, ή πώς μεγαλώνουν οι αποταμιεύσεις. Τα ποσά είναι ενδεικτικά: η τράπεζα μπορεί να έχει έξοδα ή άλλες χρεώσεις.','The bars button shows the loan against the interest, or how your savings grow. The amounts are a guide: a bank may add fees or other charges.']]},
 dates:{tips:[
  ['Πάτα μια ημερομηνία για να ανοίξει το ημερολόγιο της συσκευής. Η αρχή είναι η σημερινή ημερομηνία.','Tap a date to open your device’s calendar. The start is today’s date.'],
  ['«Διάστημα»: πόσες ημέρες είναι ανάμεσα σε δύο ημερομηνίες, σε εβδομάδες, μήνες και χρόνια, και πόσες είναι εργάσιμες.','“Between”: how many days lie between two dates, in weeks, months and years, and how many are working days.'],
  ['«Πρόσθεση»: ποια ημερομηνία είναι σε τόσες ημέρες. Το ± κάνει τις ημέρες αρνητικές, για να πας πίσω.','“Add days”: which date it is so many days later. ± makes the days negative, to go back.'],
  ['Το «Εργάσιμες» πάνω αριστερά μετρά μόνο Δευτέρα με Παρασκευή χωρίς τις αργίες, π.χ. για άδειες και προθεσμίες.','“Working days” at the top left counts only Monday to Friday without public holidays, for leave and deadlines.'],
  ['Οι αργίες είναι οι ελληνικές, μαζί με όσες αλλάζουν με το Πάσχα (Καθαρά Δευτέρα, Μεγάλη Παρασκευή, Δευτέρα του Πάσχα, Αγίου Πνεύματος). Το ? δείχνει ποιες έπεσαν μέσα.','The public holidays are Greece’s, including the ones that move with Easter (Clean Monday, Good Friday, Easter Monday, Whit Monday). ? lists the ones that fall inside.']]},
 fuel:{tips:[
  ['Συμπλήρωσε απόσταση, κατανάλωση και τιμή. Το κόστος βγαίνει αμέσως.','Fill in distance, consumption and price. The cost shows up right away.'],
  ['Την κατανάλωση σε L/100 km τη δείχνει ο υπολογιστής ταξιδιού του αυτοκινήτου. Για ταξίδι με επιστροφή, βάλε διπλή απόσταση.','The car’s trip computer shows consumption in L/100 km. For a round trip, enter double the distance.'],
  ['Ο σελιδοδείκτης αποθηκεύει τον υπολογισμό. Η λίστα δίπλα δείχνει μέση τιμή, μέση κατανάλωση και σύνολα.','The bookmark saves the calculation. The list next to it shows the average price, average consumption and totals.'],
  ['Το κουμπί με τις στήλες δείχνει πώς αλλάζει το κόστος με την απόσταση. Πάτα το αποτέλεσμα για να το αντιγράψεις.','The bars button shows how the cost changes with distance. Tap the result to copy it.']]},
 energy:{tips:[
  ['Την ισχύ σε W τη γράφει το ταμπελάκι ή το κουτί της συσκευής. Η τιμή ανά kWh είναι στον λογαριασμό του ρεύματος.','The power in W is on the device’s label or box. The price per kWh is on your electricity bill.'],
  ['Βάλε 30 ημέρες για το κόστος ενός μήνα ή 365 για έναν χρόνο.','Use 30 days for a month’s cost, or 365 for a year.'],
  ['Για συσκευές που ανάβουν και σβήνουν μόνες τους, όπως το ψυγείο, οι ώρες είναι κατά προσέγγιση.','For devices that switch on and off by themselves, like a fridge, the hours are an estimate.'],
  ['Το κουμπί με τις στήλες δείχνει το κόστος ανά ημέρα, εβδομάδα, μήνα και χρόνο. Πάτα το αποτέλεσμα για να το αντιγράψεις.','The bars button shows the cost per day, week, month and year. Tap the result to copy it.']]}
};
const HELP_TOOL_KEYS=[[['Tab'],'Επόμενο πεδίο','Next field'],[['Shift','Tab'],'Προηγούμενο πεδίο','Previous field'],[['0–9'],'Αριθμοί στο πεδίο','Type in the field'],[[',','.'],'Υποδιαστολή','Decimal point'],[['Backspace'],'Σβήνει την επιλογή ή το ψηφίο πριν τον κέρσορα','Delete the selection, or the digit before the cursor'],[['−'],'Αλλάζει το πρόσημο','Change the sign'],[['Esc'],'Κλείνει ανοιχτά παράθυρα','Close open windows'],[['Alt','1–9'],'Αλλαγή λειτουργίας','Switch mode'],[['?'],'Αυτές οι συμβουλές','These tips']];
const hasKeyboard=()=>matchMedia('(hover:hover) and (pointer:fine)').matches;
function syncHelpButton(){const l=$('#helpLabel');if(l)l.textContent=t('tips')}
function showHelp(){
 const h=HELP[mode]||HELP.calc,i=lang==='el'?0:1,keys=h.keys||HELP_TOOL_KEYS;
 $('#howTitle').textContent=t('tips')+' · '+modeText(mode);
 $('#howContent').innerHTML='<div class="help"><section class="help-section"><ul class="help-tips">'+h.tips.map(x=>'<li>'+esc(x[i])+'</li>').join('')+'</ul></section>'+
  (hasKeyboard()?'<section class="help-section"><h3 class="help-heading">'+esc(t('keyboard'))+'</h3><ul class="help-keys">'+keys.map(([k,el,en])=>'<li><span class="help-caps">'+k.map(x=>'<kbd>'+esc(x)+'</kbd>').join('')+'</span><span>'+esc(i?en:el)+'</span></li>').join('')+'</ul></section>':'')+'</div>';
 $('#howModal').classList.add('help-open');$('#howModal').classList.remove('hidden');
 $('#howContent').scrollTop=0;
}
