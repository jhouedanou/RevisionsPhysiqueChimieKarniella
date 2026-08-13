/**
 * chat-assistant.js — Assistant de révision 100 % hors-ligne 🐴
 * Site de révisions de Karniella (6e/5e).
 *
 * Autonome : une seule balise <script src="js/chat-assistant.js" defer></script>
 * suffit. Le script crée son CSS et son DOM tout seul.
 *
 * Aucune dépendance, aucun fetch, aucun appel réseau. Tout est en dur.
 */
(function () {
    'use strict';

    // Évite un double chargement si le script est injecté deux fois.
    if (window.KarniellaChat) { return; }

    /* ============================================================
       1) BASE DE CONNAISSANCES (45 entrées)
       Chaque entrée : id, matiere, keywords (mots-clés normalisés,
       sans accents, en minuscules) et reponse (HTML de confiance).
       ============================================================ */
    var BASE = [

        /* ---------- MÉTA (5) ---------- */
        {
            id: 'meta-bonjour',
            matiere: 'meta',
            keywords: ['bonjour', 'salut', 'coucou', 'bonsoir', 'hello', 'hey', 'yo'],
            reponse: 'Bonjour Karniella ! 🐴 Je suis ton poney de révision, toujours prêt à galoper avec toi. ' +
                'Dis-moi une matière ou une question : maths, physique, SVT, français, histoire-géo, éducation civique ou informatique. 🏇'
        },
        {
            id: 'meta-qui',
            matiere: 'meta',
            keywords: ['qui es tu', 'qui est tu', 'tu es qui', 'ton nom', 'comment tu t appelles', 'presente toi', 'robot', 'assistant'],
            reponse: 'Je suis <strong>ton assistant de révision</strong> 🦄, un petit programme qui vit dans ta page web. ' +
                'Je ne vais jamais sur Internet : toutes mes réponses sont rangées dans mon écurie ! 🐎<br>' +
                'Je connais les leçons du site : <a href="mathematiques.html">maths</a>, <a href="physique.html">physique</a>, ' +
                '<a href="svt-lecons.html">SVT</a>, <a href="francais-lecons.html">français</a>, ' +
                '<a href="histoire-geographie-lecons.html">histoire-géo</a>, <a href="education-civique.html">éducation civique</a> ' +
                'et <a href="tice.html">informatique</a>.'
        },
        {
            id: 'meta-aide',
            matiere: 'meta',
            keywords: ['aide', 'aidez', 'aider', 'help', 'comment ca marche', 'que sais tu', 'quoi demander', 'sujets', 'menu'],
            reponse: 'Facile ! 🐴 Écris ta question en français, par exemple :<br>' +
                '• « C\'est quoi une droite ? »<br>' +
                '• « Comment additionner deux nombres négatifs ? »<br>' +
                '• « Qu\'est-ce qu\'un court-circuit ? »<br>' +
                '• « Explique la germination »<br>' +
                '• « C\'est quoi un groupe nominal ? »<br>' +
                'Et si je ne comprends pas, je t\'indique la bonne leçon. Au trot ! 🏇'
        },
        {
            id: 'meta-merci',
            matiere: 'meta',
            keywords: ['merci', 'mercii', 'super', 'genial', 'trop bien', 'bravo', 'cool'],
            reponse: 'Avec plaisir ! 🐎 Tu travailles vraiment bien. Continue comme ça, tu es sur la bonne piste ! 🥕'
        },
        {
            id: 'meta-aurevoir',
            matiere: 'meta',
            keywords: ['au revoir', 'aurevoir', 'bye', 'a plus', 'salut a toi', 'bonne nuit', 'ciao', 'a bientot'],
            reponse: 'À bientôt Karniella ! 🐴 Repose-toi bien, et reviens quand tu veux : je reste à l\'écurie. 🌙'
        },

        /* ---------- MATHÉMATIQUES (13) ---------- */
        {
            id: 'maths-point-droite',
            matiere: 'maths',
            keywords: ['point', 'droite', 'les droites', 'quoi une droite', 'alignes', 'alignement', 'appartient', 'appartenance'],
            reponse: '📐 <strong>Point et droite</strong><br>' +
                '• Un <strong>point</strong> n\'a aucune dimension. On le dessine par une petite croix et on le nomme avec une <strong>lettre majuscule</strong> (A, B, C…).<br>' +
                '• Une <strong>droite</strong> est une ligne <strong>illimitée dans les deux sens</strong>. On la note par une lettre minuscule (d, d\') ou par deux de ses points : <strong>(AB)</strong>.<br>' +
                '• Si le point A est sur la droite d, on écrit <strong>A ∈ d</strong>. Des points sur une même droite sont <strong>alignés</strong>.<br>' +
                '👉 Par deux points distincts, il passe <strong>une seule</strong> droite !<br>' +
                'Révise ici : <a href="maths-lecon-3-droites-points.html">Droites et points</a> 🐴'
        },
        {
            id: 'maths-segment',
            matiere: 'maths',
            keywords: ['segment', 'ab', 'notation segment', 'longueur', 'milieu', 'extremite', 'extremites', 'crochets'],
            reponse: '📏 <strong>Le segment</strong><br>' +
                'Un segment est la partie de droite <strong>limitée par deux extrémités</strong> A et B.<br>' +
                '• On le note avec des crochets : <strong>[AB]</strong> (l\'objet).<br>' +
                '• Sa <strong>longueur</strong> se note <strong>AB</strong>, sans crochets (c\'est un nombre, en cm par exemple).<br>' +
                'Petit truc pour ne pas confondre 🐎 :<br>' +
                '<strong>[AB]</strong> = le segment · <strong>[AB)</strong> = la demi-droite · <strong>(AB)</strong> = la droite · <strong>AB</strong> = la longueur.<br>' +
                'Leçon : <a href="maths-lecon-segments.html">Les segments</a>'
        },
        {
            id: 'maths-demi-droite',
            matiere: 'maths',
            keywords: ['demi droite', 'demi-droite', 'origine', 'illimitee'],
            reponse: '➡️ <strong>La demi-droite</strong><br>' +
                'C\'est une partie de droite <strong>limitée d\'un seul côté</strong> par un point appelé <strong>origine</strong>, et illimitée de l\'autre côté.<br>' +
                'On note <strong>[AB)</strong> : origine A, elle passe par B et continue sans fin.<br>' +
                '💡 Deux demi-droites opposées de même origine reforment une droite entière !<br>' +
                'Leçon : <a href="maths-lecon-3-droites-points.html">Droites et points</a> 🐴'
        },
        {
            id: 'maths-secantes-perpendiculaires',
            matiere: 'maths',
            keywords: ['secantes', 'secante', 'perpendiculaires', 'perpendiculaire', 'angle droit', 'equerre', 'se coupent'],
            reponse: '📐 <strong>Droites sécantes et perpendiculaires</strong><br>' +
                '• Deux droites sont <strong>sécantes</strong> si elles se coupent en <strong>un seul point</strong>.<br>' +
                '• Elles sont <strong>perpendiculaires</strong> si elles se coupent en formant un <strong>angle droit (90°)</strong>. On note <strong>d ⊥ d\'</strong>.<br>' +
                '🔧 Pour en tracer une : on pose l\'<strong>équerre</strong> sur la droite, à l\'endroit voulu, puis on trace le long du bord perpendiculaire.<br>' +
                'Leçon : <a href="maths-lecon-4-secantes-perpendiculaires.html">Droites sécantes et perpendiculaires</a>'
        },
        {
            id: 'maths-paralleles',
            matiere: 'maths',
            keywords: ['paralleles', 'parallele', 'ne se coupent jamais', 'transitivite', 'jamais'],
            reponse: '🛤️ <strong>Droites parallèles</strong><br>' +
                'Deux droites sont <strong>parallèles</strong> si elles ne se coupent <strong>jamais</strong> : elles gardent toujours le même écart. On note <strong>d // d\'</strong>.<br>' +
                'Trois propriétés à retenir :<br>' +
                '1. <strong>Transitivité</strong> : si d // d\' et d\' // d\'\', alors d // d\'\'.<br>' +
                '2. <strong>Unicité</strong> : par un point donné, il passe <strong>une seule</strong> parallèle à une droite.<br>' +
                '3. Si deux droites sont parallèles et qu\'une troisième est perpendiculaire à l\'une, elle est perpendiculaire à l\'autre.<br>' +
                'Leçons : <a href="maths-lecon-5-droites-paralleles.html">Droites parallèles</a> et ' +
                '<a href="maths-lecon-6-proprietes.html">Propriétés des droites</a> 🐎'
        },
        {
            id: 'maths-relatifs',
            matiere: 'maths',
            keywords: ['relatif', 'relatifs', 'negatif', 'negatifs', 'positif', 'positifs', 'distance a zero', 'oppose', 'valeur absolue', 'droite graduee', 'signe'],
            reponse: '± <strong>Les nombres décimaux relatifs</strong><br>' +
                'Un nombre relatif peut être <strong>positif</strong> (+5), <strong>négatif</strong> (−5) ou <strong>nul</strong> (0).<br>' +
                '• <strong>0 n\'est ni positif ni négatif.</strong><br>' +
                '• La <strong>distance à zéro</strong> est le nombre sans son signe : |+5| = 5 et |−5| = 5. Elle est toujours positive.<br>' +
                '• L\'<strong>opposé</strong> a la même distance à zéro mais le signe contraire : l\'opposé de +7 est −7.<br>' +
                '• Sur la <strong>droite graduée</strong>, les négatifs sont à gauche de 0, les positifs à droite. Plus on va à droite, plus c\'est grand.<br>' +
                'Exemples de la vie : −10 °C (froid), +500 m d\'altitude. 🌡️<br>' +
                'Leçon : <a href="maths-lecon-7-nombres-relatifs.html">Nombres relatifs</a>'
        },
        {
            id: 'maths-somme-meme-signe',
            matiere: 'maths',
            keywords: ['somme meme signe', 'meme signe', 'additionner deux negatifs', 'addition relatifs', 'additionner relatifs', 'somme relatifs', 'addition', 'additionner', 'ajouter', 'somme', 'nombres negatifs', 'nombres positifs', 'deux negatifs', 'deux positifs'],
            reponse: '➕ <strong>Additionner deux nombres de MÊME signe</strong><br>' +
                '1. On <strong>additionne</strong> les distances à zéro.<br>' +
                '2. On <strong>garde le signe commun</strong>.<br>' +
                'Exemples :<br>' +
                '• (+5) + (+3) = <strong>+8</strong><br>' +
                '• (−7) + (−4) = <strong>−11</strong><br>' +
                '• (−0,4) + (−0,7) = <strong>−1,1</strong><br>' +
                '💡 Deux négatifs, ça descend encore plus bas ! 🐴<br>' +
                'Leçon : <a href="maths-lecon-8-somme-relatifs.html">Somme de nombres relatifs</a>'
        },
        {
            id: 'maths-somme-signes-contraires',
            matiere: 'maths',
            keywords: ['signes contraires', 'signe contraire', 'contraires', 'contraire', 'signes differents', 'plus et moins', 'positif plus negatif', 'annulent', 'difference des distances'],
            reponse: '➖ <strong>Additionner deux nombres de signes CONTRAIRES</strong><br>' +
                '1. On calcule la <strong>différence</strong> des distances à zéro (le grand moins le petit).<br>' +
                '2. On met le <strong>signe du nombre qui a la plus grande distance à zéro</strong>.<br>' +
                'Exemples :<br>' +
                '• (+8) + (−3) : 8 − 3 = 5, le plus grand est +8 → <strong>+5</strong><br>' +
                '• (−9) + (+4) : 9 − 4 = 5, le plus grand est −9 → <strong>−5</strong><br>' +
                '• (+7) + (−7) = <strong>0</strong> : deux opposés s\'annulent ! 🦄<br>' +
                'Leçon : <a href="maths-lecon-8-somme-relatifs.html">Somme de nombres relatifs</a>'
        },
        {
            id: 'maths-diviseurs',
            matiere: 'maths',
            keywords: ['diviseur', 'diviseurs', 'divisible', 'divise', 'nombre premier', 'premiers', 'nombre compose'],
            reponse: '🔢 <strong>Les diviseurs</strong><br>' +
                'Un nombre <em>a</em> est un <strong>diviseur</strong> de <em>b</em> si la division de <em>b</em> par <em>a</em> tombe juste (reste = 0).<br>' +
                'Exemple : les diviseurs de 12 sont <strong>1, 2, 3, 4, 6 et 12</strong>.<br>' +
                'À retenir :<br>' +
                '• <strong>1</strong> divise tous les nombres, et tout nombre se divise par lui-même.<br>' +
                '• Un <strong>nombre premier</strong> a exactement <strong>2</strong> diviseurs : 1 et lui-même (2, 3, 5, 7, 11, 13…).<br>' +
                '• Un <strong>nombre composé</strong> en a plus de 2.<br>' +
                'Leçon : <a href="maths-lecon-2-diviseurs.html">Diviseurs d\'un entier naturel</a> 🐎'
        },
        {
            id: 'maths-multiples',
            matiere: 'maths',
            keywords: ['multiple', 'multiples', 'consecutifs', 'consecutif', 'table de multiplication', 'calcul algebrique', 'algebrique'],
            reponse: '✖️ <strong>Multiples et nombres consécutifs</strong><br>' +
                '• Un <strong>multiple</strong> de 5, c\'est 5 multiplié par un entier : 0, 5, 10, 15, 20… C\'est la table de 5 !<br>' +
                '• Attention : « multiple » et « diviseur », c\'est le même lien vu des deux côtés : 15 est un multiple de 3, donc 3 est un diviseur de 15.<br>' +
                '• Des nombres <strong>consécutifs</strong> se suivent un par un : 7, 8, 9, 10.<br>' +
                '• Pour compter combien il y en a de <em>m</em> à <em>n</em> : <strong>n − m + 1</strong>. De 7 à 10 : 10 − 7 + 1 = <strong>4</strong> nombres. 🐴<br>' +
                'Leçon : <a href="maths-lecon-1-calculs-algebriques.html">Calculs algébriques</a>'
        },
        {
            id: 'maths-fractions',
            matiere: 'maths',
            keywords: ['fraction', 'fractions', 'numerateur', 'denominateur', 'simplifier', 'simplification', 'equivalentes'],
            reponse: '🍕 <strong>Les fractions</strong><br>' +
                'Une fraction partage un tout en parts égales. Dans <strong>3/4</strong> :<br>' +
                '• <strong>4</strong> est le <strong>dénominateur</strong> : en combien de parts on coupe.<br>' +
                '• <strong>3</strong> est le <strong>numérateur</strong> : combien de parts on prend.<br>' +
                'Deux fractions sont <strong>égales</strong> si on passe de l\'une à l\'autre en multipliant (ou divisant) le haut ET le bas par le même nombre : 1/2 = 2/4 = 50/100.<br>' +
                'Pour <strong>additionner</strong>, il faut d\'abord le <strong>même dénominateur</strong> : 1/4 + 2/4 = 3/4.<br>' +
                'Leçon : <a href="maths-lecon-fractions.html">Les fractions</a> 🦄'
        },
        {
            id: 'maths-cercle-disque',
            matiere: 'maths',
            keywords: ['cercle', 'disque', 'rayon', 'diametre', 'perimetre du cercle', 'corde', 'compas', 'centre'],
            reponse: '⭕ <strong>Cercle et disque</strong><br>' +
                '• Le <strong>cercle</strong> de centre O et de rayon r, c\'est l\'ensemble des points situés <strong>exactement</strong> à la distance r de O : c\'est juste le <strong>contour</strong>, le tour de la piste ! 🏇<br>' +
                '• Le <strong>disque</strong>, c\'est le cercle <strong>plus tout l\'intérieur</strong> (le terrain rempli).<br>' +
                '• Le <strong>diamètre</strong> passe par le centre et vaut <strong>2 × rayon</strong>.<br>' +
                '• Périmètre du cercle : <strong>P = 2 × π × r</strong> (avec π ≈ 3,14).<br>' +
                'Leçon : <a href="maths-lecon-cercles-disques.html">Cercles et disques</a>'
        },
        {
            id: 'maths-triangle',
            matiere: 'maths',
            keywords: ['triangle', 'aire', 'perimetre', 'hauteur', 'base', 'trois cotes'],
            reponse: '🔺 <strong>Le triangle</strong><br>' +
                'Un triangle a <strong>3 côtés</strong>, <strong>3 sommets</strong> et <strong>3 angles</strong>.<br>' +
                '• <strong>Périmètre</strong> = somme des 3 côtés. Ex. 3 + 4 + 5 = <strong>12 cm</strong>.<br>' +
                '• <strong>Aire</strong> = (base × hauteur) ÷ 2. La <strong>hauteur</strong> part d\'un sommet et tombe perpendiculairement sur la base.<br>' +
                'Ex. base 6 cm, hauteur 4 cm → (6 × 4) ÷ 2 = <strong>12 cm²</strong>.<br>' +
                '⚠️ Le périmètre est en cm, l\'aire en cm². Ne les mélange pas ! 🐎<br>' +
                'Leçon : <a href="maths-lecon-geometrie-triangle.html">Le triangle</a>'
        },
        {
            id: 'maths-proportionnalite',
            matiere: 'maths',
            keywords: ['proportionnalite', 'proportionnel', 'pourcentage', 'pourcentages', 'echelle', 'coefficient', 'soldes', 'reduction'],
            reponse: '📊 <strong>Proportionnalité et pourcentages</strong><br>' +
                'Deux grandeurs sont <strong>proportionnelles</strong> si on passe de l\'une à l\'autre en multipliant toujours par le <strong>même nombre</strong> : le <strong>coefficient de proportionnalité</strong>.<br>' +
                'Ex. 1 kg de riz = 500 F, alors 3 kg = 3 × 500 = <strong>1500 F</strong>. Le coefficient est 500.<br>' +
                '• <strong>Pourcentage</strong> : 25 % de 80 = 80 × 25 ÷ 100 = <strong>20</strong>.<br>' +
                '• <strong>Réduction de 20 %</strong> sur 50 F : 50 − 10 = <strong>40 F</strong>.<br>' +
                'Leçon : <a href="maths-lecon-proportionnalite.html">Proportionnalité, pourcentages et échelles</a> 🐴'
        },

        /* ---------- PHYSIQUE (7) ---------- */
        {
            id: 'phys-circuit',
            matiere: 'physique',
            keywords: ['circuit', 'circuit electrique', 'generateur', 'recepteur', 'pile', 'lampe', 'boucle', 'circuit ferme', 'circuit ouvert'],
            reponse: '⚡ <strong>Le circuit électrique</strong><br>' +
                'C\'est une <strong>boucle fermée</strong> qui contient au minimum :<br>' +
                '• un <strong>générateur</strong> (la pile) : il fournit l\'énergie électrique ;<br>' +
                '• un <strong>récepteur</strong> (la lampe, le moteur) : il utilise cette énergie ;<br>' +
                '• des <strong>fils de connexion</strong> ;<br>' +
                '• souvent un <strong>interrupteur</strong> pour commander le tout.<br>' +
                '👉 Règle d\'or : le courant ne circule que si le circuit est <strong>fermé</strong>. S\'il est <strong>ouvert</strong>, la lampe s\'éteint.<br>' +
                'Leçon : <a href="le-circuit-electrique.html">Le circuit électrique</a> 🐎'
        },
        {
            id: 'phys-sens-courant',
            matiere: 'physique',
            keywords: ['sens du courant', 'sens courant', 'borne', 'bornes', 'positive', 'negative', 'courant electrique', 'courant'],
            reponse: '🔄 <strong>Le sens du courant</strong><br>' +
                'Par convention, dans un circuit, le <strong>courant électrique circule de la borne + (positive) vers la borne − (négative)</strong> du générateur, en passant par les récepteurs.<br>' +
                '💡 Ce sens compte pour certains appareils : si tu inverses la pile, un <strong>moteur tourne dans l\'autre sens</strong>. Une lampe, elle, brille pareil.<br>' +
                'Leçon : <a href="le-circuit-electrique.html">Le circuit électrique</a>'
        },
        {
            id: 'phys-isolants-conducteurs',
            matiere: 'physique',
            keywords: ['isolant', 'isolants', 'conducteur', 'conducteurs', 'metal', 'plastique', 'conduit le courant'],
            reponse: '🔌 <strong>Conducteurs et isolants</strong><br>' +
                '• Un <strong>conducteur</strong> laisse passer le courant : les <strong>métaux</strong> (cuivre, fer, aluminium), l\'eau salée, le graphite du crayon.<br>' +
                '• Un <strong>isolant</strong> ne le laisse pas passer : <strong>plastique</strong>, bois sec, verre, caoutchouc, tissu.<br>' +
                '🛡️ C\'est pour ça que les fils électriques sont en cuivre (conducteur) <strong>entourés de plastique</strong> (isolant) : ça te protège !<br>' +
                'Leçon : <a href="le-circuit-electrique.html">Le circuit électrique</a> 🐴'
        },
        {
            id: 'phys-interrupteur',
            matiere: 'physique',
            keywords: ['interrupteur', 'bouton poussoir', 'poussoir', 'commande', 'commandes', 'sonnette', 'sonnerie', 'ouvert au repos', 'ferme au repos'],
            reponse: '🎛️ <strong>Les commandes d\'un circuit</strong><br>' +
                '• L\'<strong>interrupteur simple</strong> a deux états stables : <strong>ouvert</strong> (le courant ne passe pas, la lampe est éteinte) ou <strong>fermé</strong> (le courant passe, la lampe brille).<br>' +
                '• Le <strong>bouton poussoir ouvert au repos</strong> ne ferme le circuit que <strong>tant qu\'on appuie</strong> → exemple : la <strong>sonnette</strong>. 🔔<br>' +
                '• Le <strong>bouton poussoir fermé au repos</strong> fait l\'inverse : il s\'ouvre quand on appuie → exemple : la <strong>lampe du réfrigérateur</strong>, qui s\'éteint quand on ferme la porte.<br>' +
                'Leçon : <a href="les-commandes-electriques.html">Les commandes électriques</a>'
        },
        {
            id: 'phys-court-circuit',
            matiere: 'physique',
            keywords: ['court circuit', 'court-circuit', 'danger', 'dangers', 'incendie', 'surcharge', 'fil denude', 'denude', 'securite electrique'],
            reponse: '⚠️ <strong>Le court-circuit</strong><br>' +
                'Il y a court-circuit quand le courant trouve un <strong>chemin très court sans récepteur</strong> : il ne traverse plus la lampe, il file directement d\'une borne à l\'autre.<br>' +
                'Résultat : l\'intensité devient <strong>énorme</strong>, les fils <strong>chauffent</strong> et il y a un risque d\'<strong>incendie</strong>.<br>' +
                'Causes fréquentes : <strong>fils dénudés</strong>, prise <strong>surchargée</strong> (trop d\'appareils), branchement anarchique, <strong>eau</strong> ou humidité.<br>' +
                '🛡️ Ne touche jamais un fil abîmé et préviens un adulte.<br>' +
                'Leçon : <a href="lecon-3-court-circuit.html">Le court-circuit</a>'
        },
        {
            id: 'phys-etats-matiere',
            matiere: 'physique',
            keywords: ['etat de la matiere', 'etats de la matiere', 'solide', 'solides', 'liquide', 'liquides', 'gaz', 'gazeux', 'matiere', 'compact', 'divise'],
            reponse: '🧊💧💨 <strong>Les états de la matière</strong><br>' +
                '• <strong>Solide</strong> : forme propre et volume propre. Ex. glace, pierre, bois.<br>' +
                '• <strong>Liquide</strong> : volume propre mais <strong>pas de forme propre</strong> (il prend la forme du récipient) et sa surface libre est <strong>plane et horizontale</strong>. Ex. eau, huile.<br>' +
                '• <strong>Gaz</strong> : ni forme ni volume propre, il occupe <strong>tout</strong> l\'espace disponible. Ex. air, vapeur d\'eau.<br>' +
                '💡 Les solides peuvent être <strong>compacts</strong> (une pierre, une cuillère) ou <strong>divisés</strong> (le sable, le sucre en poudre, la farine).<br>' +
                'Leçons : <a href="lecon-etats-matiere.html">Les états de la matière</a> et <a href="lecon-4-solides-liquides.html">Solides et liquides</a> 🐎'
        },
        {
            id: 'phys-temperature',
            matiere: 'physique',
            keywords: ['temperature', 'degre', 'degres', 'celsius', 'thermometre', 'ebullition', 'fusion', 'chaud', 'froid'],
            reponse: '🌡️ <strong>La température</strong><br>' +
                'La température mesure à quel point un corps est chaud ou froid. On la mesure avec un <strong>thermomètre</strong>, en <strong>degrés Celsius (°C)</strong>.<br>' +
                'Repères à connaître :<br>' +
                '• Glace fondante : <strong>0 °C</strong><br>' +
                '• Corps humain : environ <strong>37 °C</strong><br>' +
                '• Eau qui bout : <strong>100 °C</strong><br>' +
                '⚠️ Température et chaleur, ce n\'est pas pareil : la température est une <strong>mesure</strong>, la chaleur est l\'<strong>énergie</strong> qui passe du chaud vers le froid.<br>' +
                'Leçon : <a href="lecon-temperature-corps.html">La température d\'un corps</a>'
        },

        /* ---------- SVT (7) ---------- */
        {
            id: 'svt-graine',
            matiere: 'svt',
            keywords: ['graine', 'tegument', 'cotyledon', 'cotyledons', 'embryon', 'radicule', 'tigelle', 'gemmule', 'haricot'],
            reponse: '🌱 <strong>La graine</strong><br>' +
                'Une graine est un organe végétal qui contient un <strong>embryon</strong> (la future plante) et des <strong>réserves nutritives</strong>.<br>' +
                'Ses parties :<br>' +
                '• le <strong>tégument</strong> : l\'enveloppe qui protège ;<br>' +
                '• les <strong>cotylédons</strong> : les réserves de nourriture ;<br>' +
                '• l\'<strong>embryon</strong>, formé de la <strong>radicule</strong> (future racine), de la <strong>tigelle</strong> (future tige) et de la <strong>gemmule</strong> (futures feuilles).<br>' +
                '👉 <strong>Monocotylédones</strong> = 1 cotylédon (maïs, blé, riz). <strong>Dicotylédones</strong> = 2 cotylédons (haricot, tomate, tournesol).<br>' +
                'Leçon : <a href="svt-graine-germe.html">La graine qui germe</a> 🐴'
        },
        {
            id: 'svt-germination',
            matiere: 'svt',
            keywords: ['germination', 'germer', 'germe', 'dormance', 'vie ralentie', 'plantule'],
            reponse: '🌿 <strong>La germination</strong><br>' +
                'C\'est le passage de la graine de la <strong>vie ralentie (dormance)</strong> à la <strong>vie active</strong> : elle devient une jeune plante.<br>' +
                'Les étapes, dans l\'ordre :<br>' +
                '1. La graine <strong>absorbe l\'eau</strong> et gonfle.<br>' +
                '2. Le <strong>tégument se ramollit</strong> puis se déchire.<br>' +
                '3. La <strong>radicule sort en premier</strong> et s\'enfonce dans le sol.<br>' +
                '4. La <strong>tigelle</strong> se redresse vers le haut.<br>' +
                '5. Les premières feuilles apparaissent : c\'est la <strong>plantule</strong>.<br>' +
                'Leçon : <a href="svt-graine-germe.html">La graine qui germe</a>'
        },
        {
            id: 'svt-conditions-germination',
            matiere: 'svt',
            keywords: ['conditions de germination', 'conditions', 'eau chaleur air', 'pourquoi une graine ne germe pas', 'humidite'],
            reponse: '💧☀️ <strong>Les conditions de la germination</strong><br>' +
                'Pour germer, une graine a besoin de <strong>trois choses</strong> :<br>' +
                '1. de l\'<strong>eau</strong> (pour gonfler et réveiller la graine) ;<br>' +
                '2. de l\'<strong>air</strong>, plus précisément du <strong>dioxygène</strong> (pour respirer) ;<br>' +
                '3. d\'une <strong>chaleur suffisante</strong> (une bonne température).<br>' +
                '💡 La <strong>lumière n\'est pas nécessaire</strong> pour germer : la graine a ses propres réserves ! Elle en aura besoin ensuite, pour grandir.<br>' +
                'Leçon : <a href="svt-graine-germe.html">La graine qui germe</a> 🌻'
        },
        {
            id: 'svt-croissance-plantes',
            matiere: 'svt',
            keywords: ['croissance des plantes', 'croissance plante', 'sels mineraux', 'engrais', 'lumiere', 'temoin', 'experience'],
            reponse: '🌻 <strong>La croissance des plantes</strong><br>' +
                'Pour bien grandir, une plante a besoin d\'<strong>eau</strong>, de <strong>sels minéraux</strong> (puisés dans le sol par les racines), de <strong>lumière</strong> et d\'une bonne <strong>température</strong>.<br>' +
                'Dans les expériences, on compare toujours avec un <strong>témoin</strong> : une plante qui a tout ce qu\'il lui faut. On ne change <strong>qu\'un seul facteur</strong> à la fois, sinon on ne saurait pas lequel a agi ! 🔬<br>' +
                'Résultat : la plante privée d\'eau (ou de lumière, ou de sels minéraux) grandit <strong>moins bien</strong> que le témoin.<br>' +
                'Leçon : <a href="svt-croissance-plantes.html">La croissance des plantes</a>'
        },
        {
            id: 'svt-croissance-vertebres',
            matiere: 'svt',
            keywords: ['croissance des vertebres', 'vertebres', 'vertebre', 'aliments', 'alimentation', 'ration', 'grandir'],
            reponse: '🐴 <strong>La croissance des vertébrés</strong><br>' +
                'Un vertébré (poisson, oiseau, mammifère…) grandit grâce à son <strong>alimentation</strong>.<br>' +
                '• La <strong>composition</strong> des aliments compte : il faut une alimentation <strong>équilibrée et variée</strong> (protéines pour construire, glucides et lipides pour l\'énergie, vitamines et sels minéraux).<br>' +
                '• La <strong>quantité</strong> compte aussi : trop peu de nourriture, et la croissance est <strong>ralentie</strong>.<br>' +
                '💡 Comme pour toi : bien manger, c\'est bien grandir ! 🥕<br>' +
                'Leçon : <a href="svt-croissance-vertebres.html">La croissance des vertébrés</a>'
        },
        {
            id: 'svt-reproduction-mammiferes',
            matiere: 'svt',
            keywords: ['mammifere', 'mammiferes', 'fecondation', 'spermatozoide', 'spermatozoides', 'ovule', 'gestation', 'vivipare', 'cellule oeuf', 'zygote'],
            reponse: '🐇 <strong>La reproduction des mammifères</strong><br>' +
                'Un mammifère est un animal dont la femelle <strong>allaite</strong> ses petits ; son corps est souvent couvert de poils.<br>' +
                '• Le mâle produit les <strong>spermatozoïdes</strong>, la femelle produit les <strong>ovules</strong>.<br>' +
                '• La <strong>fécondation</strong> est la rencontre d\'un spermatozoïde et d\'un ovule ; elle est <strong>interne</strong> (dans le corps de la femelle) et donne une <strong>cellule-œuf</strong>.<br>' +
                '• Le petit se développe dans l\'<strong>utérus</strong> pendant la <strong>gestation</strong>, puis naît vivant : le mammifère est <strong>vivipare</strong>.<br>' +
                'Leçon : <a href="svt-reproduction-mammiferes.html">Reproduction des mammifères</a> 🐎'
        },
        {
            id: 'svt-reproduction-oiseaux',
            matiere: 'svt',
            keywords: ['oiseau', 'oiseaux', 'oeuf', 'oeufs', 'ovipare', 'parade nuptiale', 'couvaison', 'incubation', 'nid', 'eclosion'],
            reponse: '🐦 <strong>La reproduction des oiseaux</strong><br>' +
                'Les oiseaux ont un corps couvert de <strong>plumes</strong> et un bec.<br>' +
                '• Avant l\'accouplement, le mâle fait souvent une <strong>parade nuptiale</strong> (chants, danses, couleurs) pour séduire la femelle.<br>' +
                '• La <strong>fécondation est interne</strong>, mais la femelle <strong>pond des œufs</strong> : l\'oiseau est <strong>ovipare</strong>.<br>' +
                '• Les parents <strong>couvent</strong> les œufs (incubation) dans un <strong>nid</strong> pour les garder au chaud, jusqu\'à l\'<strong>éclosion</strong> des poussins.<br>' +
                'Leçon : <a href="svt-reproduction-oiseaux.html">Reproduction des oiseaux</a>'
        },

        /* ---------- FRANÇAIS (3) ---------- */
        {
            id: 'fr-groupe-nominal',
            matiere: 'francais',
            keywords: ['groupe nominal', 'gn', 'nom noyau', 'noyau', 'nominal'],
            reponse: '📖 <strong>Le groupe nominal (GN)</strong><br>' +
                'C\'est un ensemble de mots organisés autour d\'un <strong>nom</strong>, appelé le <strong>nom noyau</strong> : c\'est le mot le plus important du groupe.<br>' +
                '• GN <strong>minimal</strong> : déterminant + nom → <em>le chat</em>, <em>une fleur</em>.<br>' +
                '• GN <strong>étendu</strong> : enrichi par d\'autres mots → <em>le petit chat noir</em>.<br>' +
                'Dans la phrase, le GN peut être <strong>sujet</strong>, <strong>COD</strong>, <strong>COI</strong>, complément circonstanciel ou attribut du sujet.<br>' +
                '💡 Astuce : si tu peux remplacer le groupe par <em>il, elle, ils, elles</em>, c\'est un GN ! <em>Les enfants jouent → Ils jouent.</em> ✓<br>' +
                'Leçon : <a href="francais-groupe-nominal.html">Le groupe nominal</a> 🐴'
        },
        {
            id: 'fr-determinant',
            matiere: 'francais',
            keywords: ['determinant', 'determinants', 'article', 'articles', 'defini', 'indefini', 'possessif', 'demonstratif', 'genre', 'nombre'],
            reponse: '✏️ <strong>Le déterminant</strong><br>' +
                'Il se place <strong>avant le nom</strong> et indique son <strong>genre</strong> (masculin / féminin) et son <strong>nombre</strong> (singulier / pluriel).<br>' +
                '• Articles <strong>définis</strong> : le, la, l\', les<br>' +
                '• Articles <strong>indéfinis</strong> : un, une, des<br>' +
                '• Articles <strong>partitifs</strong> : du, de la, de l\'<br>' +
                '• <strong>Possessifs</strong> : mon, ma, mes, ton, ta, tes, son, sa, ses, notre, votre, leur…<br>' +
                '• <strong>Démonstratifs</strong> : ce, cet, cette, ces<br>' +
                '💡 Les noms propres (Paris, Marie) s\'emploient souvent <strong>sans</strong> déterminant.<br>' +
                'Leçon : <a href="francais-groupe-nominal.html">Le groupe nominal</a>'
        },
        {
            id: 'fr-expansions',
            matiere: 'francais',
            keywords: ['expansion', 'expansions', 'epithete', 'adjectif', 'complement du nom', 'proposition relative', 'relative', 'enrichir'],
            reponse: '🎀 <strong>Les expansions du nom</strong><br>' +
                'Ce sont les mots qui viennent <strong>enrichir le nom noyau</strong>. Il y en a trois principales :<br>' +
                '1. L\'<strong>adjectif qualificatif épithète</strong> : <em>une robe <u>rouge</u></em><br>' +
                '2. Le <strong>complément du nom</strong> (introduit par de, à, en…) : <em>une robe <u>de soie</u></em><br>' +
                '3. La <strong>proposition subordonnée relative</strong> (qui, que, dont, où) : <em>une robe <u>que j\'adore</u></em><br>' +
                '👉 Astuce : les expansions peuvent se <strong>supprimer</strong>, la phrase reste correcte. Le nom noyau, lui, est indispensable ! 🦄<br>' +
                'Leçon : <a href="francais-groupe-nominal.html">Le groupe nominal</a>'
        },

        /* ---------- HISTOIRE-GÉOGRAPHIE (2) ---------- */
        {
            id: 'hist-sources-historiques',
            matiere: 'histoire',
            keywords: ['source historique', 'sources historiques', 'histoire', 'archeologique', 'archeologie', 'source orale', 'source ecrite', 'vestige', 'historien'],
            reponse: '📜 <strong>Les sources historiques</strong><br>' +
                'Une source historique est une <strong>trace laissée par le passé</strong> qui permet à l\'historien de reconstituer l\'histoire. Il y en a trois grandes familles :<br>' +
                '1. Les sources <strong>écrites</strong> : manuscrits, lettres, registres, journaux, inscriptions.<br>' +
                '2. Les sources <strong>orales</strong> : récits des anciens, contes, légendes, chants transmis de bouche à oreille (les <em>griots</em> !).<br>' +
                '3. Les sources <strong>archéologiques</strong> (ou muettes) : objets, poteries, outils, ossements, ruines.<br>' +
                '💡 L\'historien <strong>croise plusieurs sources</strong> pour être sûr de ce qu\'il raconte. 🐎<br>' +
                'Leçon : <a href="histoire-sources-histoire.html">Les sources de l\'histoire</a>'
        },
        {
            id: 'hist-sources-information',
            matiere: 'histoire',
            keywords: ['source d information', 'sources d information', 'information', 'media', 'medias', 'fiabilite', 'fiable', 'fake news', 'verifier', 'rumeur', 'internet information'],
            reponse: '📰 <strong>Les sources d\'information</strong><br>' +
                'Ce sont les endroits d\'où vient une information :<br>' +
                '• les <strong>médias traditionnels</strong> : radio, télévision, journaux ;<br>' +
                '• les <strong>médias numériques</strong> : sites web, réseaux sociaux, blogs ;<br>' +
                '• les <strong>sources directes</strong> : témoins, spécialistes.<br>' +
                'Pour vérifier une information 🔍 : demande-toi <strong>qui</strong> l\'a écrite, <strong>quand</strong>, et regarde si <strong>plusieurs sources sérieuses</strong> disent la même chose.<br>' +
                '⚠️ Sur les réseaux sociaux, tout le monde peut publier n\'importe quoi : ne partage pas une info que tu n\'as pas vérifiée !<br>' +
                'Leçon : <a href="histoire-sources-information.html">Les sources d\'information</a>'
        },

        /* ---------- ÉDUCATION CIVIQUE / ECM (4) ---------- */
        {
            id: 'ecm-droits-humains',
            matiere: 'civique',
            keywords: ['droit', 'droits', 'droits humains', 'droits de l enfant', 'devoir', 'devoirs', 'democratie', 'constitution', 'generation'],
            reponse: '⚖️ <strong>Les droits humains</strong><br>' +
                'Ce sont les droits que possède <strong>toute personne</strong>, dès la naissance, sans distinction de sexe, de religion ou d\'origine.<br>' +
                'On les classe en trois générations :<br>' +
                '1. Droits <strong>civils et politiques</strong> : vivre, être libre, voter, s\'exprimer.<br>' +
                '2. Droits <strong>économiques, sociaux et culturels</strong> : l\'éducation 🎒, la santé, le travail, le logement.<br>' +
                '3. Droits de <strong>solidarité</strong> : la paix, un environnement sain, le développement.<br>' +
                '👉 L\'enfant a des droits à la <strong>survie</strong> (nourriture, soins) et à la <strong>protection</strong> (contre les violences et le travail des enfants).<br>' +
                'Leçon : <a href="education-civique.html">Éducation civique</a> · <a href="education-civique-quiz.html">Quiz</a>'
        },
        {
            id: 'ecm-securite-routiere',
            matiere: 'civique',
            keywords: ['securite routiere', 'route', 'panneau', 'panneaux', 'signalisation', 'pieton', 'pietons', 'usager', 'usagers', 'circulation', 'feu tricolore'],
            reponse: '🚦 <strong>La sécurité routière</strong><br>' +
                'Les <strong>usagers de la route</strong> sont tous ceux qui l\'utilisent : <strong>piétons</strong>, cyclistes, motocyclistes, conducteurs et passagers.<br>' +
                'La <strong>signalisation</strong> les guide :<br>' +
                '• panneaux <strong>ronds</strong> à bord rouge → <strong>interdiction</strong> ;<br>' +
                '• panneaux <strong>ronds bleus</strong> → <strong>obligation</strong> ;<br>' +
                '• panneaux <strong>triangulaires</strong> → <strong>danger</strong>.<br>' +
                'Feux : <strong>rouge</strong> = stop, <strong>orange</strong> = je ralentis et je me prépare à m\'arrêter, <strong>vert</strong> = je peux passer.<br>' +
                '🐴 En tant que piéton : marche sur le trottoir, traverse sur le passage clouté, et regarde à gauche, à droite, puis encore à gauche !<br>' +
                'Leçon : <a href="ecm-lecon-8-securite-routiere.html">Sécurité routière</a>'
        },
        {
            id: 'ecm-secteur-primaire',
            matiere: 'civique',
            keywords: ['secteur primaire', 'secteur', 'agriculture', 'elevage', 'peche', 'cacao', 'cafe', 'economie', 'exportation', 'production'],
            reponse: '🌾 <strong>Le secteur primaire</strong><br>' +
                'C\'est le secteur qui <strong>tire directement ses produits de la nature</strong> : <strong>agriculture</strong>, <strong>élevage</strong>, <strong>pêche</strong>, exploitation forestière et minière.<br>' +
                'En Côte d\'Ivoire 🇨🇮, il est essentiel : <strong>cacao</strong> (1er producteur mondial !), <strong>café</strong>, hévéa, palmier à huile, anacarde, coton, ainsi que l\'igname, le manioc et le riz pour la nourriture.<br>' +
                'Pour créer une activité : on <strong>identifie le projet</strong> et on étudie le marché, on choisit le <strong>terrain</strong>, on calcule le <strong>budget</strong>, puis on produit et on vend.<br>' +
                'Leçon : <a href="ecm-lecon-9-secteur-primaire.html">Le secteur primaire</a> 🐎'
        },
        {
            id: 'ecm-puberte',
            matiere: 'civique',
            keywords: ['puberte', 'adolescence', 'ado', 'changement du corps', 'grandir corps', 'abstinence', 'hygiene'],
            reponse: '🌱 <strong>La puberté</strong><br>' +
                'La puberté est la période où le corps de l\'enfant se transforme peu à peu en corps d\'adulte. C\'est <strong>normal</strong>, et cela n\'arrive pas au même âge pour tout le monde. 🦄<br>' +
                'Les bons réflexes :<br>' +
                '• soigner son <strong>hygiène</strong> (douche, vêtements propres) ;<br>' +
                '• bien manger et bien dormir ;<br>' +
                '• <strong>parler</strong> à un adulte de confiance quand on a une question ou une inquiétude ;<br>' +
                '• se respecter et respecter les autres.<br>' +
                'Leçons : <a href="ecm-lecon-10-puberte.html">La puberté</a> · <a href="ecm-lecon-11-abstinence.html">L\'abstinence</a>'
        },

        /* ---------- INFORMATIQUE / TICE (4) ---------- */
        {
            id: 'info-systeme',
            matiere: 'informatique',
            keywords: ['systeme informatique', 'ordinateur', 'materiel', 'hardware', 'logiciel', 'logiciels', 'software', 'informatique'],
            reponse: '💻 <strong>Le système informatique</strong><br>' +
                'Un système informatique, c\'est l\'ensemble formé par :<br>' +
                '• le <strong>matériel</strong> (<em>hardware</em>) : tout ce qu\'on peut <strong>toucher</strong> — l\'unité centrale, l\'écran, le clavier, la souris ;<br>' +
                '• le <strong>logiciel</strong> (<em>software</em>) : les <strong>programmes</strong> — le système d\'exploitation (Windows, Linux) et les applications (traitement de texte, navigateur).<br>' +
                '💡 Analogie : le matériel c\'est le <strong>cheval</strong>, le logiciel c\'est ce qu\'on lui apprend à faire ! 🐴<br>' +
                'Leçon : <a href="tice.html">TICE — Système informatique</a>'
        },
        {
            id: 'info-peripheriques',
            matiere: 'informatique',
            keywords: ['peripherique', 'peripheriques', 'entree', 'sortie', 'clavier', 'souris', 'ecran', 'imprimante', 'scanner', 'unite centrale'],
            reponse: '🖥️ <strong>Les périphériques</strong><br>' +
                'Ce sont les appareils branchés autour de l\'unité centrale :<br>' +
                '• <strong>Entrée</strong> (ils envoient l\'information à l\'ordinateur) : <strong>clavier</strong>, <strong>souris</strong>, scanner, micro, webcam.<br>' +
                '• <strong>Sortie</strong> (ils affichent le résultat) : <strong>écran</strong>, <strong>imprimante</strong>, haut-parleurs, vidéoprojecteur.<br>' +
                '• <strong>Entrée-sortie</strong> (les deux !) : écran tactile, clé USB, disque dur externe, modem.<br>' +
                'Leçon : <a href="tice.html">TICE — Système informatique</a> 🐎'
        },
        {
            id: 'info-internet',
            matiere: 'informatique',
            keywords: ['internet', 'web', 'reseau', 'site', 'navigateur', 'moteur de recherche', 'email', 'mot de passe', 'securite en ligne', 'www'],
            reponse: '🌐 <strong>Internet</strong><br>' +
                'Internet est le <strong>réseau mondial</strong> qui relie des millions d\'ordinateurs entre eux.<br>' +
                '⚠️ Ne confonds pas : <strong>Internet</strong> est le réseau (les routes), le <strong>Web</strong> est un des services qui circulent dessus (les sites qu\'on visite). D\'autres services : la <strong>messagerie</strong>, le partage de fichiers, la visioconférence.<br>' +
                'Pour naviguer : un <strong>navigateur</strong> (Chrome, Firefox) et un <strong>moteur de recherche</strong>.<br>' +
                '🛡️ Sécurité : un <strong>mot de passe solide</strong> et secret, on ne donne jamais ses informations personnelles, et on prévient un adulte si quelque chose met mal à l\'aise.<br>' +
                'Leçon : <a href="informatique-culture-numerique-internet.html">Le réseau Internet</a>'
        },
        {
            id: 'info-impression',
            matiere: 'informatique',
            keywords: ['impression', 'imprimer', 'apercu', 'apercu avant impression', 'traitement de texte', 'mise en page', 'copies'],
            reponse: '🖨️ <strong>Aperçu et impression</strong><br>' +
                'L\'<strong>aperçu avant impression</strong> montre à l\'écran <strong>exactement</strong> ce qui sortira sur le papier. On l\'utilise pour vérifier la <strong>mise en page</strong> (marges, sauts de page, images) <strong>avant</strong> de gaspiller de l\'encre ou du papier. ♻️<br>' +
                'Pour imprimer : menu <em>Fichier → Imprimer</em> (ou <strong>Ctrl + P</strong>). On choisit alors l\'<strong>imprimante</strong>, les <strong>pages</strong> à imprimer et le <strong>nombre de copies</strong>.<br>' +
                'Leçon : <a href="informatique-lecon-3-apercu-impression.html">Aperçu et impression</a> 🐴'
        }
    ];

    /* ============================================================
       2) OUTILS DE NORMALISATION ET DE RECHERCHE
       ============================================================ */

    // Petits mots ignorés dans le calcul du score.
    var STOP_WORDS = {
        le: 1, la: 1, les: 1, un: 1, une: 1, des: 1, du: 1, de: 1, et: 1, ou: 1,
        est: 1, ce: 1, cet: 1, cette: 1, ces: 1, que: 1, qui: 1, quoi: 1, quel: 1,
        quelle: 1, pour: 1, avec: 1, dans: 1, sur: 1, par: 1, plus: 1, moi: 1,
        toi: 1, tu: 1, je: 1, il: 1, elle: 1, on: 1, nous: 1, vous: 1, son: 1,
        sa: 1, ses: 1, mon: 1, ma: 1, mes: 1, en: 1, au: 1, aux: 1, se: 1, sont: 1,
        cest: 1, qu: 1, quest: 1, ai: 1, avoir: 1, besoin: 1, veut: 1, dit: 1,
        sais: 1, dis: 1, dire: 1, explique: 1, expliquer: 1, definition: 1,
        peux: 1, veux: 1, comment: 1, pourquoi: 1, quand: 1, ai: 1, as: 1, a: 1,
        pas: 1, ne: 1, si: 1, tout: 1, tous: 1, faire: 1, fait: 1, sil: 1, stp: 1
    };

    /** Minuscules, sans accents, sans ponctuation, espaces normalisés. */
    function normaliser(texte) {
        return String(texte)
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')   // supprime les accents
            .replace(/[’'`]/g, ' ')            // apostrophes : l'eau -> l eau, qu'est-ce -> qu est ce
            .replace(/[^a-z0-9]+/g, ' ')       // le reste devient espace
            .replace(/\s+/g, ' ')
            .trim();
    }

    /** Découpe en mots utiles (>= 2 lettres, hors mots vides). */
    function decouper(texteNormalise) {
        var mots = texteNormalise.split(' ');
        var utiles = [];
        for (var i = 0; i < mots.length; i++) {
            var m = mots[i];
            if (m.length >= 2 && !STOP_WORDS[m]) { utiles.push(m); }
        }
        return utiles;
    }

    /** Score d'une entrée face à la question de l'utilisateur. */
    function scorer(entree, questionNorm, motsQuestion) {
        var score = 0;
        for (var i = 0; i < entree.keywords.length; i++) {
            var kw = entree.keywords[i];
            if (kw.indexOf(' ') !== -1) {
                // Mot-clé composé : on cherche l'expression entière.
                if (questionNorm.indexOf(kw) !== -1) { score += 3.5; }
                continue;
            }
            for (var j = 0; j < motsQuestion.length; j++) {
                var mot = motsQuestion[j];
                if (mot === kw) {
                    score += 2;
                } else if (mot.length >= 4 && kw.length >= 4 &&
                          (mot.indexOf(kw) === 0 || kw.indexOf(mot) === 0)) {
                    // Tolère les variantes : fraction / fractions, droite / droites.
                    score += 1.3;
                }
            }
        }
        return score;
    }

    var SEUIL = 1.9; // en dessous : on ne fait pas confiance au résultat

    /** Cherche la meilleure réponse ; renvoie null si rien de convaincant. */
    function chercher(question) {
        var qNorm = normaliser(question);
        if (!qNorm) { return null; }
        var mots = decouper(qNorm);
        var meilleure = null;
        var meilleurScore = 0;
        for (var i = 0; i < BASE.length; i++) {
            var s = scorer(BASE[i], qNorm, mots);
            if (s > meilleurScore) { meilleurScore = s; meilleure = BASE[i]; }
        }
        return meilleurScore >= SEUIL ? meilleure : null;
    }

    /**
     * Réponse de repli quand rien ne correspond.
     * `question` vient de l'utilisateur : elle DOIT passer par echapper().
     */
    function repli(question) {
        return 'Hop, là je sèche un peu 🐴 ! Je n\'ai rien trouvé sur « ' +
            echapper(String(question).slice(0, 80)) + ' » dans mon écurie.<br>' +
            'Essaie une autre formulation, ou choisis un sujet :<br>' +
            '• 🔢 <a href="mathematiques.html">Maths</a> — droites, segments, nombres relatifs, fractions, triangle<br>' +
            '• ⚡ <a href="physique.html">Physique</a> — circuit, court-circuit, états de la matière, température<br>' +
            '• 🌱 <a href="svt-lecons.html">SVT</a> — la graine, la germination, la reproduction<br>' +
            '• 📖 <a href="francais-lecons.html">Français</a> — le groupe nominal, les déterminants<br>' +
            '• 🌍 <a href="histoire-geographie-lecons.html">Histoire-géo</a> — les sources<br>' +
            '• ⚖️ <a href="education-civique.html">Éducation civique</a> — droits, route, secteur primaire<br>' +
            '• 💻 <a href="tice.html">Informatique</a> — ordinateur, Internet, impression<br>' +
            'Au galop, on va y arriver ! 🏇';
    }

    /* ============================================================
       3) STYLES (injectés dans <head>)
       ============================================================ */
    var CSS = [
        '#kc-bulle{position:fixed;right:20px;bottom:20px;z-index:99998;width:62px;height:62px;',
        'border-radius:50%;border:3px solid #FFE5F0;cursor:pointer;font-size:28px;line-height:1;',
        'background:linear-gradient(135deg,#FF69B4 0%,#C71585 100%);color:#fff;',
        'box-shadow:0 6px 20px rgba(199,21,133,.45);transition:transform .25s ease,box-shadow .25s ease;',
        'display:flex;align-items:center;justify-content:center;font-family:inherit;padding:0}',
        '#kc-bulle:hover{transform:scale(1.09) rotate(-6deg);box-shadow:0 10px 28px rgba(199,21,133,.6)}',
        '#kc-bulle:focus-visible{outline:3px solid #8B5A2B;outline-offset:3px}',

        '#kc-fenetre{position:fixed;right:20px;bottom:96px;z-index:99999;width:370px;max-width:calc(100vw - 32px);',
        'height:min(560px,calc(100vh - 130px));display:none;flex-direction:column;overflow:hidden;',
        'background:linear-gradient(160deg,#FFF8F2 0%,#FFF0F5 100%);border:3px solid #C71585;border-radius:18px;',
        'box-shadow:0 18px 50px rgba(139,90,43,.35);',
        "font-family:'Comic Sans MS','Segoe UI',Tahoma,Verdana,sans-serif;font-size:14px;color:#4A3728}",
        '#kc-fenetre.kc-ouvert{display:flex}',

        '#kc-entete{background:linear-gradient(135deg,#FF69B4 0%,#C71585 100%);color:#fff;padding:12px 14px;',
        'display:flex;align-items:center;gap:10px;border-bottom:3px solid #C89F6D;flex:0 0 auto}',
        '#kc-entete .kc-titre{font-weight:700;font-size:15px;line-height:1.25;text-shadow:1px 1px 3px rgba(0,0,0,.3)}',
        '#kc-entete .kc-sous{font-size:11px;opacity:.92}',
        '#kc-fermer{margin-left:auto;background:rgba(255,255,255,.22);border:2px solid #FFE5F0;color:#fff;',
        'width:30px;height:30px;border-radius:50%;cursor:pointer;font-size:16px;line-height:1;font-family:inherit;padding:0}',
        '#kc-fermer:hover{background:#8B5A2B;border-color:#F5E6D3}',
        '#kc-fermer:focus-visible{outline:3px solid #F5E6D3;outline-offset:2px}',

        '#kc-messages{flex:1 1 auto;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px}',
        '.kc-msg{max-width:88%;padding:10px 13px;border-radius:14px;line-height:1.5;word-wrap:break-word;overflow-wrap:break-word}',
        '.kc-bot{align-self:flex-start;background:#fff;border:2px solid #C89F6D;border-left:5px solid #FF69B4;',
        'border-radius:14px 14px 14px 4px;color:#4A3728}',
        '.kc-user{align-self:flex-end;background:linear-gradient(135deg,#FF69B4 0%,#C71585 100%);color:#fff;',
        'border:2px solid #C71585;border-radius:14px 14px 4px 14px;text-shadow:1px 1px 2px rgba(0,0,0,.25)}',
        '.kc-msg a{color:#C71585;font-weight:700}',
        '.kc-msg a:hover{color:#8B5A2B}',
        '.kc-user a{color:#FFE5F0}',

        '#kc-suggestions{flex:0 0 auto;padding:8px 12px;display:flex;flex-wrap:wrap;gap:6px;',
        'background:#F5E6D3;border-top:2px dashed #C89F6D}',
        '.kc-sug{background:#fff;border:2px solid #FF69B4;color:#C71585;border-radius:14px;padding:5px 10px;',
        'font-size:11.5px;font-weight:700;cursor:pointer;font-family:inherit;transition:all .2s ease}',
        '.kc-sug:hover{background:linear-gradient(135deg,#FF69B4 0%,#C71585 100%);color:#fff;border-color:#8B5A2B}',
        '.kc-sug:focus-visible{outline:3px solid #8B5A2B;outline-offset:2px}',

        '#kc-formulaire{flex:0 0 auto;display:flex;gap:8px;padding:10px 12px;background:#fff;border-top:3px solid #C89F6D}',
        '#kc-saisie{flex:1 1 auto;min-width:0;border:2px solid #C89F6D;border-radius:20px;padding:9px 14px;',
        'font-family:inherit;font-size:14px;color:#4A3728;background:#FFF8F2}',
        '#kc-saisie:focus{outline:none;border-color:#FF69B4;box-shadow:0 0 0 3px rgba(255,105,180,.25)}',
        '#kc-envoyer{flex:0 0 auto;background:linear-gradient(135deg,#FF69B4 0%,#C71585 100%);color:#fff;',
        'border:2px solid #C71585;border-radius:20px;padding:0 15px;font-size:17px;cursor:pointer;font-family:inherit}',
        '#kc-envoyer:hover{background:linear-gradient(135deg,#8B5A2B 0%,#C71585 100%)}',
        '#kc-envoyer:focus-visible{outline:3px solid #8B5A2B;outline-offset:2px}',

        // Plein écran sur mobile
        '@media (max-width:768px){',
        '#kc-fenetre{right:0;bottom:0;left:0;top:0;width:100%;max-width:100%;height:100%;border-radius:0;border-width:0}',
        '#kc-bulle{right:14px;bottom:14px;width:56px;height:56px;font-size:25px}',
        '#kc-messages{padding:12px}',
        '}',

        // Respecte la préférence "moins d'animations"
        '@media (prefers-reduced-motion:reduce){#kc-bulle{transition:none}#kc-bulle:hover{transform:none}}'
    ].join('');

    /* ============================================================
       4) CONSTRUCTION DE L'INTERFACE
       ============================================================ */

    var SUGGESTIONS = [
        'C\'est quoi une droite ?',
        'Additionner deux nombres négatifs',
        'Le circuit électrique',
        'La germination',
        'Le groupe nominal',
        'Les droits humains'
    ];

    var ACCUEIL = 'Bonjour Karniella ! 🐴 Je suis ton assistant de révision, et je travaille ' +
        '<strong>sans Internet</strong> : tout est dans ma tête ! 🦄<br>' +
        'Pose-moi une question sur les <strong>maths</strong>, la <strong>physique</strong>, la <strong>SVT</strong>, ' +
        'le <strong>français</strong>, l\'<strong>histoire-géo</strong>, l\'<strong>éducation civique</strong> ' +
        'ou l\'<strong>informatique</strong>. En selle ! 🏇';

    var elFenetre, elBulle, elMessages, elSaisie, elFermer;
    var dernierFocus = null;

    /** Échappe le HTML : indispensable pour le texte tapé par l'utilisateur. */
    function echapper(texte) {
        return String(texte)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    /** Ajoute un message. `html` n'est vrai que pour nos propres réponses. */
    function ajouterMessage(contenu, auteur, html) {
        var div = document.createElement('div');
        div.className = 'kc-msg ' + (auteur === 'user' ? 'kc-user' : 'kc-bot');
        if (html) {
            div.innerHTML = contenu;             // contenu de confiance (base interne)
        } else {
            div.textContent = contenu;           // texte utilisateur : jamais en innerHTML
        }
        elMessages.appendChild(div);
        elMessages.scrollTop = elMessages.scrollHeight;
        return div;
    }

    /** Traite la question saisie. */
    function envoyer() {
        var question = elSaisie.value.trim();
        if (!question) { return; }

        ajouterMessage(question, 'user', false);
        elSaisie.value = '';

        var trouvee = chercher(question);
        var reponse = trouvee ? trouvee.reponse : repli(question);

        // Petit délai pour que l'échange ait l'air vivant.
        window.setTimeout(function () {
            ajouterMessage(reponse, 'bot', true);
        }, 220);
    }

    function ouvrir() {
        dernierFocus = document.activeElement;
        elFenetre.classList.add('kc-ouvert');
        elFenetre.setAttribute('aria-hidden', 'false');
        elBulle.setAttribute('aria-expanded', 'true');
        elBulle.textContent = '🐎';
        elSaisie.focus();
        elMessages.scrollTop = elMessages.scrollHeight;
    }

    function fermer() {
        elFenetre.classList.remove('kc-ouvert');
        elFenetre.setAttribute('aria-hidden', 'true');
        elBulle.setAttribute('aria-expanded', 'false');
        elBulle.textContent = '🐴';
        if (dernierFocus && typeof dernierFocus.focus === 'function') {
            dernierFocus.focus();
        } else {
            elBulle.focus();
        }
    }

    function basculer() {
        if (elFenetre.classList.contains('kc-ouvert')) { fermer(); } else { ouvrir(); }
    }

    /** Crée le CSS, le DOM et branche les événements. */
    function initialiser() {
        if (document.getElementById('kc-bulle')) { return; }

        // -- CSS
        var style = document.createElement('style');
        style.id = 'kc-styles';
        style.textContent = CSS;
        document.head.appendChild(style);

        // -- Bouton flottant
        elBulle = document.createElement('button');
        elBulle.id = 'kc-bulle';
        elBulle.type = 'button';
        elBulle.textContent = '🐴';
        elBulle.setAttribute('aria-label', 'Ouvrir l\'assistant de révision');
        elBulle.setAttribute('aria-expanded', 'false');
        elBulle.setAttribute('aria-controls', 'kc-fenetre');
        elBulle.setAttribute('title', 'Besoin d\'aide ? Clique ici ! 🐴');

        // -- Fenêtre
        elFenetre = document.createElement('div');
        elFenetre.id = 'kc-fenetre';
        elFenetre.setAttribute('role', 'dialog');
        elFenetre.setAttribute('aria-modal', 'false');
        elFenetre.setAttribute('aria-label', 'Assistant de révision de Karniella');
        elFenetre.setAttribute('aria-hidden', 'true');

        // Entête
        var entete = document.createElement('div');
        entete.id = 'kc-entete';
        var bloc = document.createElement('div');
        var titre = document.createElement('div');
        titre.className = 'kc-titre';
        titre.textContent = '🐴 Mon assistant de révision';
        var sous = document.createElement('div');
        sous.className = 'kc-sous';
        sous.textContent = 'Hors-ligne · toutes les matières';
        bloc.appendChild(titre);
        bloc.appendChild(sous);
        elFermer = document.createElement('button');
        elFermer.id = 'kc-fermer';
        elFermer.type = 'button';
        elFermer.textContent = '✕';
        elFermer.setAttribute('aria-label', 'Fermer l\'assistant');
        entete.appendChild(bloc);
        entete.appendChild(elFermer);

        // Zone de conversation
        elMessages = document.createElement('div');
        elMessages.id = 'kc-messages';
        elMessages.setAttribute('role', 'log');
        elMessages.setAttribute('aria-live', 'polite');
        elMessages.setAttribute('aria-label', 'Conversation');

        // Suggestions cliquables
        var sugs = document.createElement('div');
        sugs.id = 'kc-suggestions';
        sugs.setAttribute('aria-label', 'Suggestions de questions');
        SUGGESTIONS.forEach(function (texte) {
            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'kc-sug';
            b.textContent = texte;
            b.addEventListener('click', function () {
                elSaisie.value = texte;
                envoyer();
                elSaisie.focus();
            });
            sugs.appendChild(b);
        });

        // Formulaire de saisie
        var form = document.createElement('form');
        form.id = 'kc-formulaire';
        elSaisie = document.createElement('input');
        elSaisie.id = 'kc-saisie';
        elSaisie.type = 'text';
        elSaisie.autocomplete = 'off';
        elSaisie.placeholder = 'Pose ta question…';
        elSaisie.setAttribute('aria-label', 'Écris ta question');
        var envoi = document.createElement('button');
        envoi.id = 'kc-envoyer';
        envoi.type = 'submit';
        envoi.textContent = '➤';
        envoi.setAttribute('aria-label', 'Envoyer la question');
        form.appendChild(elSaisie);
        form.appendChild(envoi);

        elFenetre.appendChild(entete);
        elFenetre.appendChild(elMessages);
        elFenetre.appendChild(sugs);
        elFenetre.appendChild(form);

        document.body.appendChild(elBulle);
        document.body.appendChild(elFenetre);

        // Message d'accueil
        ajouterMessage(ACCUEIL, 'bot', true);

        // -- Événements
        elBulle.addEventListener('click', basculer);
        elFermer.addEventListener('click', fermer);
        form.addEventListener('submit', function (e) {
            e.preventDefault();   // la touche Entrée passe par ici
            envoyer();
        });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && elFenetre.classList.contains('kc-ouvert')) {
                fermer();
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialiser);
    } else {
        initialiser();
    }

    // Unique point d'entrée global (utile pour les tests et le débogage).
    window.KarniellaChat = {
        ouvrir: ouvrir,
        fermer: fermer,
        basculer: basculer,
        chercher: chercher,
        base: BASE
    };
})();
