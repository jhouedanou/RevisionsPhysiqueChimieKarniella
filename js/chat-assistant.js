/**
 * chat-assistant.js — Assistant de révision 100 % hors-ligne 🐴
 * Site de révisions de Karniella (6e/5e).
 *
 * Autonome : une seule balise <script src="js/chat-assistant.js" defer></script>
 * suffit. Le script crée son CSS et son DOM tout seul, et charge lui-même ce
 * dont il a besoin — aucune page HTML n'a à être modifiée.
 *
 * Trois niveaux de réponse, du plus rapide au plus rare :
 *   1. les notions de LA page courante   (data/chat/<slug>.json, hors-ligne)
 *   2. la base générale ci-dessous        (en dur, hors-ligne)
 *   3. l'API Claude via /api/chat         (seulement si 1 et 2 échouent ET
 *                                          qu'il y a du réseau — jamais requis)
 *
 * Tout ce qui touche au réseau dégrade en silence : sans connexion, sans clé
 * API ou sans fichier généré, le chat reste utilisable comme avant.
 */
(function () {
    'use strict';

    // Évite un double chargement si le script est injecté deux fois.
    if (window.KarniellaChat) { return; }

    /**
     * Racine du site, déduite de l'URL de CE script.
     *
     * Les pages de pages-composantes/ nous chargent via « ../js/chat-assistant.js » :
     * un chemin relatif comme « data/chat/x.json » y viserait
     * pages-composantes/data/chat/x.json, qui n'existe pas. On repart donc de
     * l'adresse du script, valable depuis n'importe quelle profondeur.
     */
    var RACINE = (function () {
        var script = document.currentScript;
        if (script && script.src) {
            return script.src.replace(/js\/chat-assistant\.js(\?.*)?$/, '');
        }
        return '';   // repli : relatif à la page courante
    })();

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

    /* ============================================================
       2 bis) CONNAISSANCES DE LA PAGE COURANTE
       Deux fichiers générés par `npm run build:chat` :
         js/chat-knowledge-index.js  toutes les pages, titres seuls
         data/chat/<slug>.json       le détail de CETTE page
       Les deux sont facultatifs : sans eux on retombe sur BASE.
       ============================================================ */

    var CONNAISSANCES = {
        slug: null,        // identifiant de la page, tiré de l'URL
        index: null,       // window.KarniellaChatKnowledge.pages
        page: null,        // entrée d'index de la page courante
        detail: null,      // contenu de data/chat/<slug>.json
        entrees: [],       // notions de la page, converties en entrées scorables
        voisines: []       // notions des autres pages de la même matière
    };

    /** Slug de la page : « /maths-lecon-fractions.html » -> « maths-lecon-fractions ». */
    function slugPage() {
        var fichier = window.location.pathname.split('/').pop() || 'index.html';
        return fichier.replace(/\.html$/, '') || 'index';
    }

    /** Onglet actuellement ouvert, s'il y en a un (les leçons à onglets). */
    function ongletActif() {
        var actif = document.querySelector('.tab-content.active');
        return actif ? actif.id : null;
    }

    /**
     * Mots-clés d'une notion, dérivés de son titre : mots simples + bigrammes.
     * Volontairement calculés ici plutôt que pré-générés : le générateur et le
     * navigateur partageraient sinon deux copies de `normaliser()`, qui
     * finiraient par diverger sans que rien ne le signale.
     */
    function motsClesDepuisTitre(titre) {
        var mots = decouper(normaliser(titre));
        var cles = mots.slice();
        for (var i = 0; i < mots.length - 1; i++) {
            cles.push(mots[i] + ' ' + mots[i + 1]);
        }
        return cles;
    }

    /** Libellé lisible d'un onglet (« Présentation ») à partir de son id. */
    function libelleOnglet(idOnglet) {
        var onglets = (CONNAISSANCES.detail && CONNAISSANCES.detail.onglets) || [];
        for (var i = 0; i < onglets.length; i++) {
            if (onglets[i].id === idOnglet) { return onglets[i].libelle; }
        }
        return null;
    }

    /** Transforme les notions détaillées de la page en entrées scorables. */
    function construireEntreesPage() {
        var detail = CONNAISSANCES.detail;
        if (!detail || !detail.notions) { return []; }

        return detail.notions.map(function (notion, i) {
            var libelle = libelleOnglet(notion.onglet);
            var reponse = '<strong>' + echapper(notion.titre) + '</strong><br>' +
                echapper(notion.texte);
            if (libelle) {
                reponse += '<br><span class="kc-source">📍 Onglet « ' +
                    echapper(libelle) +' » de cette page</span>';
            }
            return {
                id: 'page:' + detail.slug + ':' + i,
                matiere: detail.matiere,
                keywords: motsClesDepuisTitre(notion.titre),
                reponse: reponse
            };
        });
    }

    /**
     * Notions des AUTRES pages de la même matière. On ne connaît que leurs
     * titres (l'index ne porte pas les textes) : la réponse est donc un renvoi
     * vers la bonne leçon, ce qui vaut mieux qu'un « je ne sais pas ».
     */
    function construireEntreesVoisines() {
        var index = CONNAISSANCES.index;
        var page = CONNAISSANCES.page;
        if (!index || !page) { return []; }

        var entrees = [];
        Object.keys(index).forEach(function (slug) {
            var autre = index[slug];
            if (slug === CONNAISSANCES.slug || autre.matiere !== page.matiere) { return; }

            (autre.notions || []).forEach(function (notion, i) {
                entrees.push({
                    id: 'voisine:' + slug + ':' + i,
                    matiere: autre.matiere,
                    keywords: motsClesDepuisTitre(notion.titre),
                    reponse: 'Ça, c\'est dans une autre leçon : <strong>' +
                        echapper(notion.titre) + '</strong>.<br>' +
                        'Tu la trouveras dans <a href="' + echapper(slug) + '.html">' +
                        echapper(autre.titre) + '</a> 🐴'
                });
            });
        });
        return entrees;
    }

    /** Recalcule les entrées dérivées après un chargement. */
    function rafraichirEntrees() {
        CONNAISSANCES.entrees = construireEntreesPage();
        CONNAISSANCES.voisines = construireEntreesVoisines();
    }

    /**
     * Charge l'index (balise <script>, donc servi en cache-first par le service
     * worker et fonctionnel même sans `fetch`), puis le détail de la page.
     * Chaque étape échoue en silence : le chat doit rester utilisable.
     */
    function chargerConnaissances(quandPret) {
        CONNAISSANCES.slug = slugPage();

        function suiteIndex() {
            var base = window.KarniellaChatKnowledge;
            if (base && base.pages) {
                CONNAISSANCES.index = base.pages;
                CONNAISSANCES.page = base.pages[CONNAISSANCES.slug] || null;
            }
            chargerDetail(quandPret);
        }

        chargerProgression();

        if (window.KarniellaChatKnowledge) { suiteIndex(); return; }

        var script = document.createElement('script');
        script.src = RACINE + 'js/chat-knowledge-index.js';
        script.onload = suiteIndex;
        script.onerror = suiteIndex;   // index absent : on continue sans
        document.head.appendChild(script);
    }

    /** Charge js/progression.js. Facultatif : sans lui, le chat marche pareil. */
    function chargerProgression() {
        if (window.KarniellaProgression) { return; }
        var script = document.createElement('script');
        script.src = RACINE + 'js/progression.js';
        document.head.appendChild(script);
    }

    function chargerDetail(quandPret) {
        if (!CONNAISSANCES.page || typeof window.fetch !== 'function') {
            rafraichirEntrees();
            if (quandPret) { quandPret(); }
            return;
        }

        window.fetch(RACINE + 'data/chat/' + CONNAISSANCES.slug + '.json')
            .then(function (r) { return r.ok ? r.json() : null; })
            .catch(function () { return null; })
            .then(function (detail) {
                CONNAISSANCES.detail = detail;
                rafraichirEntrees();
                if (window.KarniellaProgression && detail) {
                    window.KarniellaProgression.marquerVisite(detail.slug, detail.matiere);
                }
                if (quandPret) { quandPret(); }
            });
    }

    /** Retrouve une entrée par son id, pour rejouer l'historique sans stocker de HTML. */
    function entreeParId(id) {
        var groupes = [CONNAISSANCES.entrees, CONNAISSANCES.voisines, BASE];
        for (var g = 0; g < groupes.length; g++) {
            for (var i = 0; i < groupes[g].length; i++) {
                if (groupes[g][i].id === id) { return groupes[g][i]; }
            }
        }
        return null;
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

    var SEUIL = 1.9;       // en dessous : on ne fait pas confiance au résultat
    var SEUIL_PAGE = 1.4;  // sur SA propre page, on accorde un peu plus de crédit

    /**
     * Cherche la meilleure réponse, en trois cercles concentriques.
     *
     * Le seuil filtre sur le score BRUT (« est-ce seulement pertinent ? »), et
     * le coefficient ne sert qu'à départager les niveaux entre eux. Mélanger
     * les deux — abaisser le seuil ET multiplier le score — reviendrait à
     * appliquer le bonus deux fois, et la page courante gagnerait toujours.
     *
     * Renvoie null si rien de convaincant : c'est ce null qui déclenche le
     * repli IA puis, à défaut, le message d'échec.
     */
    function chercher(question) {
        var qNorm = normaliser(question);
        if (!qNorm) { return null; }
        var mots = decouper(qNorm);

        var niveaux = [
            { entrees: CONNAISSANCES.entrees,  coef: 2.0, seuil: SEUIL_PAGE },
            { entrees: CONNAISSANCES.voisines, coef: 1.3, seuil: SEUIL },
            { entrees: BASE,                   coef: 1.0, seuil: SEUIL }
        ];

        var meilleure = null;
        var meilleurScore = 0;

        for (var n = 0; n < niveaux.length; n++) {
            var niveau = niveaux[n];
            for (var i = 0; i < niveau.entrees.length; i++) {
                var brut = scorer(niveau.entrees[i], qNorm, mots);
                if (brut < niveau.seuil) { continue; }
                var pondere = brut * niveau.coef;
                if (pondere > meilleurScore) {
                    meilleurScore = pondere;
                    meilleure = niveau.entrees[i];
                }
            }
        }
        return meilleure;
    }

    /**
     * Réponse de repli quand rien ne correspond.
     * `question` vient de l'utilisateur : elle DOIT passer par echapper().
     */
    function repli(question) {
        var debut = 'Hop, là je sèche un peu 🐴 ! Je n\'ai rien trouvé sur « ' +
            echapper(String(question).slice(0, 80)) + ' ».<br>';

        // Si on sait sur quelle leçon on est, on montre ce qu'elle contient :
        // bien plus utile que la liste des sept matières du site.
        var notions = (CONNAISSANCES.detail && CONNAISSANCES.detail.notions) || [];
        if (notions.length) {
            var titre = CONNAISSANCES.detail.titre;
            var liste = notions.slice(0, 6).map(function (n) {
                return '• ' + echapper(n.titre);
            }).join('<br>');
            return debut + 'Sur cette page (<strong>' + echapper(titre) + '</strong>), ' +
                'je connais :<br>' + liste + '<br>' +
                'Demande-moi l\'une de ces notions, ou reformule ta question. 🏇';
        }

        return debut +
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
        '#kc-bulle{position:fixed;right:20px;bottom:20px;z-index:99998;width:58px;height:58px;',
        'border-radius:18px;border:1px solid rgba(255,255,255,.7);cursor:pointer;font-size:25px;line-height:1;',
        'background:linear-gradient(145deg,#B9366C 0%,#7F2E53 100%);color:#fff;',
        'box-shadow:0 12px 30px rgba(73,30,50,.24);transition:transform .25s ease,box-shadow .25s ease;',
        'display:flex;align-items:center;justify-content:center;font-family:inherit;padding:0}',
        '#kc-bulle:hover{transform:translateY(-3px);box-shadow:0 16px 34px rgba(73,30,50,.3)}',
        '#kc-bulle:focus-visible{outline:3px solid #8A2BE2;outline-offset:3px}',

        '#kc-fenetre{position:fixed;right:20px;bottom:96px;z-index:99999;width:370px;max-width:calc(100vw - 32px);',
        'height:min(560px,calc(100vh - 130px));display:none;flex-direction:column;overflow:hidden;',
        'background:#FFF9FB;border:1px solid rgba(72,40,55,.14);border-radius:22px;',
        'box-shadow:0 24px 70px rgba(73,30,50,.24);',
        "font-family:'Aptos','Avenir Next','Nunito Sans','Segoe UI',sans-serif;font-size:14px;color:#49353F}",
        '#kc-fenetre.kc-ouvert{display:flex}',

        '#kc-entete{background:linear-gradient(125deg,#35212D 0%,#9D2F5C 100%);color:#fff;padding:15px 16px;',
        'display:flex;align-items:center;gap:10px;border-bottom:0;flex:0 0 auto}',
        '#kc-entete .kc-titre{font-weight:800;font-size:15px;line-height:1.25;text-shadow:none}',
        '#kc-entete .kc-sous{font-size:11px;opacity:.92}',
        '#kc-fermer{margin-left:auto;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.24);color:#fff;',
        'width:32px;height:32px;border-radius:10px;cursor:pointer;font-size:15px;line-height:1;font-family:inherit;padding:0}',
        '#kc-fermer:hover{background:#fff;color:#35212D}',
        '#kc-fermer:focus-visible{outline:3px solid #fff;outline-offset:2px}',

        '#kc-messages{flex:1 1 auto;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px}',
        '.kc-msg{max-width:88%;padding:10px 13px;border-radius:14px;line-height:1.5;word-wrap:break-word;overflow-wrap:break-word}',
        '.kc-bot{align-self:flex-start;background:#fff;border:1px solid rgba(72,40,55,.12);border-left:4px solid #C83F76;',
        'border-radius:14px 14px 14px 4px;color:#49353F}',
        '.kc-user{align-self:flex-end;background:#9D2F5C;color:#fff;',
        'border:1px solid #9D2F5C;border-radius:14px 14px 4px 14px;text-shadow:none}',
        '.kc-msg a{color:#9D2F5C;font-weight:700}',
        '.kc-msg a:hover{color:#8B5A2B}',
        '.kc-user a{color:#FFE5F0}',

        '#kc-suggestions{flex:0 0 auto;padding:9px 12px;display:flex;flex-wrap:wrap;gap:6px;',
        'background:#F9EAF0;border-top:1px solid rgba(72,40,55,.1)}',
        '.kc-sug{background:#fff;border:1px solid rgba(157,47,92,.22);color:#9D2F5C;border-radius:10px;padding:6px 10px;',
        'font-size:11.5px;font-weight:700;cursor:pointer;font-family:inherit;transition:all .2s ease}',
        '.kc-sug:hover{background:#9D2F5C;color:#fff;border-color:#9D2F5C}',
        '.kc-sug:focus-visible{outline:3px solid #8A2BE2;outline-offset:2px}',

        '.kc-source{display:block;margin-top:6px;font-size:11px;opacity:.75;font-style:italic}',
        '.kc-plus-simple{display:inline-block;margin-top:8px;background:none;border:0;padding:0;',
        'color:#9D2F5C;font-family:inherit;font-size:11.5px;font-weight:700;cursor:pointer;text-decoration:underline}',
        '.kc-plus-simple:hover{color:#7F2E53}',
        '.kc-plus-simple:focus-visible{outline:3px solid #8A2BE2;outline-offset:2px}',
        '.kc-attente{opacity:.7;font-style:italic}',

        '#kc-actions{flex:0 0 auto;display:flex;flex-wrap:wrap;gap:6px;padding:9px 12px 0;background:#F9EAF0}',
        '.kc-action{flex:1 1 45%;background:#fff;border:1px solid rgba(157,47,92,.3);color:#9D2F5C;',
        'border-radius:10px;padding:8px 6px;font-size:11.5px;font-weight:700;cursor:pointer;',
        'font-family:inherit;line-height:1.3;transition:all .2s ease}',
        '.kc-action:hover{background:#9D2F5C;color:#fff;border-color:#9D2F5C}',
        '.kc-action:focus-visible{outline:3px solid #8A2BE2;outline-offset:2px}',
        '#kc-suggestions:empty{display:none}',

        '.kc-options{display:flex;flex-direction:column;gap:5px;margin-top:9px}',
        '.kc-option{width:100%;text-align:left;background:#FFF9FB;border:1px solid rgba(157,47,92,.28);',
        'color:#49353F;border-radius:9px;padding:8px 11px;font-size:12.5px;font-family:inherit;',
        'cursor:pointer;line-height:1.35;transition:all .15s ease}',
        '.kc-option:hover:not(:disabled){background:#9D2F5C;color:#fff;border-color:#9D2F5C}',
        '.kc-option:focus-visible{outline:3px solid #8A2BE2;outline-offset:2px}',
        '.kc-option:disabled{cursor:default;opacity:.85}',
        '.kc-option.kc-juste{background:#E4F5E8;border-color:#3C9A57;color:#1F5C33;font-weight:700;opacity:1}',
        '.kc-option.kc-faux{background:#FBE4E9;border-color:#C0392B;color:#8B2318;opacity:1}',
        '.kc-verdict{display:block;margin-top:9px;font-weight:700}',

        '.kc-jauge{display:block;height:7px;border-radius:4px;background:rgba(157,47,92,.16);margin:5px 0 9px;overflow:hidden}',
        '.kc-jauge span{display:block;height:100%;border-radius:4px;background:linear-gradient(90deg,#C83F76,#9D2F5C)}',

        '#kc-formulaire{flex:0 0 auto;display:flex;gap:8px;padding:11px 12px;background:#fff;border-top:1px solid rgba(72,40,55,.1)}',
        '#kc-saisie{flex:1 1 auto;min-width:0;border:1px solid rgba(72,40,55,.18);border-radius:12px;padding:10px 13px;',
        'font-family:inherit;font-size:14px;color:#49353F;background:#FFF9FB}',
        '#kc-saisie:focus{outline:none;border-color:#C83F76;box-shadow:0 0 0 3px rgba(200,63,118,.14)}',
        '#kc-envoyer{flex:0 0 auto;background:#9D2F5C;color:#fff;',
        'border:1px solid #9D2F5C;border-radius:12px;padding:0 15px;font-size:17px;cursor:pointer;font-family:inherit}',
        '#kc-envoyer:hover{background:#7F2E53}',
        '#kc-envoyer:focus-visible{outline:3px solid #8A2BE2;outline-offset:2px}',

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

    // Suggestions générales, servies tant qu'on ne sait rien de la page.
    var SUGGESTIONS_PAR_DEFAUT = [
        'C\'est quoi une droite ?',
        'Additionner deux nombres négatifs',
        'Le circuit électrique',
        'La germination',
        'Le groupe nominal',
        'Les droits humains'
    ];

    /** Suggestions tirées des notions de la page courante, sinon les générales. */
    function suggestions() {
        var notions = (CONNAISSANCES.detail && CONNAISSANCES.detail.notions) || [];
        if (notions.length < 2) { return SUGGESTIONS_PAR_DEFAUT; }
        return notions.slice(0, 4).map(function (n) { return n.titre; });
    }

    var ACCUEIL_PAR_DEFAUT = 'Bonjour Karniella ! 🐴 Je suis ton assistant de révision.<br>' +
        'Pose-moi une question sur les <strong>maths</strong>, la <strong>physique</strong>, la <strong>SVT</strong>, ' +
        'le <strong>français</strong>, l\'<strong>histoire-géo</strong>, l\'<strong>éducation civique</strong> ' +
        'ou l\'<strong>informatique</strong>. En selle ! 🏇';

    /** Message d'accueil : il nomme la leçon quand on sait où on est. */
    function accueil() {
        var page = CONNAISSANCES.detail || CONNAISSANCES.page;
        if (!page || !page.titre) { return ACCUEIL_PAR_DEFAUT; }

        var texte = 'Bonjour Karniella ! 🐴 Tu es sur <strong>' + echapper(page.titre) + '</strong>.<br>' +
            'Demande-moi ce que tu veux sur cette leçon — ou utilise les deux boutons en bas ' +
            'pour une fiche de révision ou un coup de main sur un exercice. 🏇';

        var notions = (CONNAISSANCES.detail && CONNAISSANCES.detail.notions) || [];
        if (notions.length) {
            texte += '<span class="kc-source">Je connais ' + notions.length +
                ' notions de cette page.</span>';
        }
        return texte;
    }

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

    /**
     * Rend du texte NON fiable (réponse du modèle) en construisant des nœuds DOM.
     *
     * `ajouterMessage(..., true)` passe par innerHTML : ce drapeau veut dire
     * « écrit par nous, en dur, dans ce fichier ». Une réponse de modèle ne
     * remplit pas cette condition, et ne doit jamais emprunter ce chemin — d'où
     * cette troisième voie, qui gère un markdown minimal sans jamais interpréter
     * de HTML.
     */
    function rendreTexte(div, texte) {
        div.textContent = '';
        String(texte).split('\n').forEach(function (ligne, i) {
            if (i > 0) { div.appendChild(document.createElement('br')); }
            var propre = ligne.replace(/^\s*[-*•]\s+/, '• ');
            propre.split('**').forEach(function (morceau, j) {
                if (!morceau) { return; }
                if (j % 2 === 1) {
                    var gras = document.createElement('strong');
                    gras.textContent = morceau;
                    div.appendChild(gras);
                } else {
                    div.appendChild(document.createTextNode(morceau));
                }
            });
        });
    }

    /** Message du bot rendu en texte sûr (réponses IA, erreurs). */
    function ajouterTexteBot(texte) {
        var div = document.createElement('div');
        div.className = 'kc-msg kc-bot';
        rendreTexte(div, texte);
        elMessages.appendChild(div);
        elMessages.scrollTop = elMessages.scrollHeight;
        return div;
    }

    /** Bouton « Explique plus simplement » sous une réponse. */
    function ajouterBoutonPlusSimple(div, question) {
        var bouton = document.createElement('button');
        bouton.type = 'button';
        bouton.className = 'kc-plus-simple';
        bouton.textContent = '🙋 Explique plus simplement';
        bouton.addEventListener('click', function () {
            bouton.remove();
            traiter(question, 'simplifier');
        });
        div.appendChild(document.createElement('br'));
        div.appendChild(bouton);
    }

    /* ============================================================
       HISTORIQUE — une conversation par page, dans localStorage.
       On ne stocke jamais de HTML : seulement de quoi le reconstruire
       depuis le code. Une entrée trafiquée dans le stockage ne peut donc
       pas se retrouver injectée en innerHTML au rechargement.
         { u: texte }      question de Karniella
         { b: idEntree }   réponse issue d'une entrée (rejouée depuis le code)
         { f: question }   message d'échec (rejoué en appelant repli())
         { r: 1 }          fiche de révision (rejouée en appelant ficheDeRevision())
         { p: 1 }          bilan de progression (recalculé à l'affichage)
         { t: texte }      texte brut (réponse IA, erreur)
       ============================================================ */

    var MAX_HISTORIQUE = 20;

    function cleHistorique() { return 'kc-hist-' + (CONNAISSANCES.slug || 'page'); }

    // localStorage lève dans un iframe cloisonné ou en navigation privée stricte :
    // aucune de ces fonctions ne doit pouvoir casser le chat.
    function lireHistorique() {
        try {
            return JSON.parse(window.localStorage.getItem(cleHistorique())) || [];
        } catch (err) { return []; }
    }

    function noterHistorique(entree) {
        try {
            var tout = lireHistorique();
            tout.push(entree);
            window.localStorage.setItem(
                cleHistorique(),
                JSON.stringify(tout.slice(-MAX_HISTORIQUE))
            );
        } catch (err) { /* stockage indisponible : on continue sans */ }
    }

    function restaurerHistorique() {
        var tout = lireHistorique();
        if (!tout.length) { return false; }

        tout.forEach(function (e) {
            if (e.u !== undefined) { ajouterMessage(e.u, 'user', false); return; }
            if (e.b !== undefined) {
                var entree = entreeParId(e.b);
                if (entree) { ajouterMessage(entree.reponse, 'bot', true); }
                return;
            }
            if (e.f !== undefined) { ajouterMessage(repli(e.f), 'bot', true); return; }
            if (e.r !== undefined) {
                var fiche = ficheDeRevision();
                if (fiche) { ajouterMessage(fiche, 'bot', true); }
                return;
            }
            // Recalculé plutôt que stocké : un bilan figé serait périmé.
            if (e.p !== undefined) { ajouterMessage(bilanProgression(), 'bot', true); return; }
            if (e.t !== undefined) { ajouterTexteBot(e.t); }
        });
        return true;
    }

    /** Les derniers tours, au format attendu par l'API. */
    function historiquePourIA() {
        return lireHistorique()
            .slice(-6)
            .map(function (e) {
                if (e.u !== undefined) { return { role: 'user', content: e.u }; }
                if (e.t !== undefined) { return { role: 'assistant', content: e.t }; }
                return null;
            })
            .filter(Boolean);
    }

    /* ============================================================
       REPLI IA — /api/chat, uniquement quand la base locale n'a rien.
       ============================================================ */

    // Passe à false dès qu'on sait que l'API n'est pas là (pas de clé,
    // pas de serveur) : inutile de refaire une requête à chaque question.
    var iaDisponible = true;

    function iaEnvisageable() {
        return iaDisponible &&
            typeof window.fetch === 'function' &&
            window.navigator.onLine !== false;
    }

    function demanderIA(question, mode, historique, quandFini) {
        window.fetch(RACINE + 'api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                slug: CONNAISSANCES.slug,
                question: question,
                mode: mode || 'explication',
                historique: historique
            })
        })
            .then(function (r) {
                if (r.status === 503 || r.status === 404) { iaDisponible = false; }
                if (!r.ok) { throw new Error('http ' + r.status); }
                return r.json();
            })
            .then(function (data) {
                quandFini(data && data.reponse ? data.reponse : null);
            })
            .catch(function () { quandFini(null); });
    }

    /* ============================================================
       FICHE DE RÉVISION — construite localement à partir des notions.
       Volontairement pas déléguée au modèle : on a déjà le contenu exact
       de la page, et cette version-là marche hors-ligne et instantanément.
       ============================================================ */

    function ficheDeRevision() {
        var detail = CONNAISSANCES.detail;
        var notions = (detail && detail.notions) || [];
        if (!notions.length) {
            return null;
        }

        var html = '📝 <strong>À retenir — ' + echapper(detail.titre) + '</strong><br><br>';
        notions.slice(0, 8).forEach(function (n) {
            html += '<strong>' + echapper(n.titre) + '</strong><br>' +
                echapper(n.texte) + '<br><br>';
        });
        if (detail.quiz && detail.quiz.length) {
            html += '<span class="kc-source">Cette leçon a aussi ' + detail.quiz.length +
                ' questions de quiz — demande-moi de t\'en poser une. 🐴</span>';
        }
        return html;
    }

    /* ============================================================
       MODE « INTERROGE-MOI »
       Entièrement hors-ligne : les questions sont déjà dans
       data/chat/<slug>.json. Aucun appel réseau, jamais.
       ============================================================ */

    var quizEnCours = { posees: [], justes: 0, total: 0, serie: null };

    /** Tire une question encore jamais posée dans cette session. */
    function questionSuivante() {
        var questions = (CONNAISSANCES.detail && CONNAISSANCES.detail.quiz) || [];
        var restantes = [];
        for (var i = 0; i < questions.length; i++) {
            if (quizEnCours.posees.indexOf(i) === -1) { restantes.push(i); }
        }
        if (!restantes.length) { return null; }
        var choix = restantes[Math.floor(Math.random() * restantes.length)];
        quizEnCours.posees.push(choix);
        return { index: choix, question: questions[choix] };
    }

    /** Mêmes paliers que les quiz de page (js/section-quiz.js) : un seul ton sur tout le site. */
    function felicitations(pourcentage) {
        if (pourcentage === 100) { return '🎉 Parfait !'; }
        if (pourcentage >= 66) { return '👍 Bien joué !'; }
        if (pourcentage >= 33) { return '💪 Continue tes efforts !'; }
        return '📚 Relis la leçon !';
    }

    /** Clôt la série en cours et enregistre le résultat. */
    function terminerQuiz() {
        if (!quizEnCours.total) { return; }

        var pourcentage = Math.round((quizEnCours.justes / quizEnCours.total) * 100);
        var texte = felicitations(pourcentage) + ' Tu as ' + quizEnCours.justes +
            ' bonne' + (quizEnCours.justes > 1 ? 's' : '') + ' réponse' +
            (quizEnCours.justes > 1 ? 's' : '') + ' sur ' + quizEnCours.total + '.';

        // Rien à enregistrer ici : chaque réponse a déjà mis la série à jour.
        ajouterTexteBot(texte);
        noterHistorique({ t: texte });
        quizEnCours = { posees: [], justes: 0, total: 0, serie: null };
    }

    /** Affiche une question et ses options cliquables. */
    function poserQuestion() {
        if (!quizEnCours.serie) { quizEnCours.serie = 's' + Date.now(); }
        var tirage = questionSuivante();

        if (!tirage) {
            // Plus rien à poser : soit la page n'a pas de quiz, soit on a fait le tour.
            if (quizEnCours.total) { terminerQuiz(); return; }

            var msg = 'Cette page n\'a pas encore de quiz 🐴. ' +
                'Demande-moi plutôt une <strong>fiche de révision</strong>, ou pose-moi ' +
                'une question sur une notion de la leçon !';
            ajouterMessage(msg, 'bot', true);
            return;
        }

        var q = tirage.question;
        var div = document.createElement('div');
        div.className = 'kc-msg kc-bot';

        var enonce = document.createElement('div');
        enonce.innerHTML = '🎯 <strong>Question ' + (quizEnCours.total + 1) + '</strong><br>' +
            echapper(q.question);
        div.appendChild(enonce);

        var liste = document.createElement('div');
        liste.className = 'kc-options';

        q.options.forEach(function (option) {
            var bouton = document.createElement('button');
            bouton.type = 'button';
            bouton.className = 'kc-option';
            bouton.textContent = option;
            bouton.addEventListener('click', function () {
                repondreQuestion(liste, q, option, div);
            });
            liste.appendChild(bouton);
        });

        div.appendChild(liste);
        elMessages.appendChild(div);
        elMessages.scrollTop = elMessages.scrollHeight;
    }

    /** Corrige la réponse choisie et propose la suite. */
    function repondreQuestion(liste, q, choisie, div) {
        var juste = choisie === q.reponse;
        quizEnCours.total += 1;
        if (juste) { quizEnCours.justes += 1; }

        // Fige les options et montre où était la bonne réponse.
        Array.prototype.forEach.call(liste.children, function (bouton) {
            bouton.disabled = true;
            if (bouton.textContent === q.reponse) { bouton.classList.add('kc-juste'); }
            else if (bouton.textContent === choisie) { bouton.classList.add('kc-faux'); }
        });

        // Enregistré à chaque réponse : Karniella s'arrête quand elle veut, et
        // n'ira presque jamais au bout des 20 questions d'une leçon.
        if (window.KarniellaProgression) {
            window.KarniellaProgression.enregistrerQuiz(
                CONNAISSANCES.slug, quizEnCours.justes, quizEnCours.total, quizEnCours.serie);
        }

        var verdict = document.createElement('span');
        verdict.className = 'kc-verdict';
        verdict.textContent = juste ? '✅ Bravo, c\'est ça !' : '❌ Pas tout à fait.';
        div.appendChild(verdict);

        if (q.explication) {
            var explication = document.createElement('div');
            explication.className = 'kc-source';
            explication.textContent = q.explication;
            div.appendChild(explication);
        }

        // L'historique ne garde que le résumé : réinjecter des boutons
        // interactifs au rechargement n'aurait aucun sens.
        noterHistorique({ t: q.question + '\n' + verdict.textContent +
            ' Réponse : ' + q.reponse });

        var suite = document.createElement('button');
        suite.type = 'button';
        suite.className = 'kc-plus-simple';
        var reste = ((CONNAISSANCES.detail && CONNAISSANCES.detail.quiz) || []).length -
            quizEnCours.posees.length;
        suite.textContent = reste > 0 ? '➡️ Question suivante' : '🏁 Voir mon score';
        suite.addEventListener('click', function () {
            suite.remove();
            poserQuestion();
        });
        div.appendChild(document.createElement('br'));
        div.appendChild(suite);

        elMessages.scrollTop = elMessages.scrollHeight;
    }

    /* ============================================================
       « OÙ J'EN SUIS ? »
       ============================================================ */

    var NOMS_MATIERES = {
        mathematiques: '🔢 Maths',
        physique: '⚡ Physique',
        svt: '🌱 SVT',
        'histoire-geo': '🌍 Histoire-géo',
        'education-civique': '⚖️ Éducation civique',
        francais: '📖 Français',
        tice: '💻 Informatique'
    };

    function bilanProgression() {
        var suivi = window.KarniellaProgression;
        if (!suivi) { return 'Je n\'arrive pas à lire tes progrès pour le moment 🐴.'; }
        if (!suivi.disponible()) {
            return 'Ton navigateur n\'autorise pas la sauvegarde 🐴 : je ne peux pas ' +
                'retenir tes progrès ici. Tout le reste fonctionne normalement !';
        }

        var lignes = suivi.resume(CONNAISSANCES.index);
        if (!lignes.length) {
            return '📊 On commence tout juste ! Fais un quiz avec le bouton ' +
                '<strong>🎯 Interroge-moi</strong> et je garderai la trace de tes scores. 🐴';
        }

        var html = '📊 <strong>Où tu en es</strong><br><br>';
        lignes.forEach(function (l) {
            var nom = NOMS_MATIERES[l.matiere] || l.matiere;
            var part = l.total ? Math.round((l.vues / l.total) * 100) : 0;
            html += '<strong>' + echapper(nom) + '</strong> — ' + l.vues +
                (l.total ? ' leçon' + (l.vues > 1 ? 's' : '') + ' vue' +
                    (l.vues > 1 ? 's' : '') + ' sur ' + l.total : '') +
                (l.scoreMoyen !== null ? ' · moyenne ' + l.scoreMoyen + '%' : '') +
                '<span class="kc-jauge"><span style="width:' + part + '%"></span></span>';
        });

        var page = suivi.pourPage(CONNAISSANCES.slug);
        if (page && page.meilleurScore !== null) {
            html += '<span class="kc-source">Sur cette page, ton meilleur score est ' +
                page.meilleurScore + '%.</span>';
        }
        return html;
    }

    /* ============================================================
       TRAITEMENT D'UNE QUESTION
       ============================================================ */

    var MAX_QUESTION = 500;

    /**
     * @param question texte saisi (ou libellé de l'action déclenchée)
     * @param mode     explication | exercice | fiche | simplifier
     */
    function traiter(question, mode) {
        mode = mode || 'explication';
        question = String(question).trim().slice(0, MAX_QUESTION);
        if (!question) { return; }

        // Capturé AVANT d'y ajouter la question : sinon elle partirait deux fois,
        // une fois dans l'historique et une fois comme message final.
        var tours = historiquePourIA();

        ajouterMessage(question, 'user', false);
        noterHistorique({ u: question });
        // Seules les vraies questions comptent : un clic sur « Interroge-moi »
        // ou « Où j'en suis ? » n'est pas une question sur la leçon.
        if (window.KarniellaProgression && (mode === 'explication' || mode === 'simplifier')) {
            window.KarniellaProgression.enregistrerQuestion(CONNAISSANCES.slug);
        }

        // Le mode quiz est purement local : les questions sont déjà chargées.
        if (mode === 'quiz') {
            window.setTimeout(poserQuestion, 200);
            return;
        }

        if (mode === 'progression') {
            var bilan = bilanProgression();
            window.setTimeout(function () {
                ajouterMessage(bilan, 'bot', true);
                noterHistorique({ p: 1 });
            }, 200);
            return;
        }

        // La fiche de révision se fabrique sur place, sans réseau.
        if (mode === 'fiche') {
            var fiche = ficheDeRevision();
            window.setTimeout(function () {
                if (fiche) {
                    ajouterMessage(fiche, 'bot', true);
                    noterHistorique({ r: 1 });
                } else {
                    var msg = 'Je n\'ai pas encore de fiche pour cette page 🐴. ' +
                        'Va sur une leçon et redemande-moi !';
                    ajouterTexteBot(msg);
                    noterHistorique({ t: msg });
                }
            }, 200);
            return;
        }

        // « Explique plus simplement » et l'aide sur exercice sont génératives :
        // la base locale ne sait pas les produire, on va directement à l'IA.
        var generatif = (mode === 'simplifier' || mode === 'exercice');
        var trouvee = generatif ? null : chercher(question);

        if (trouvee) {
            window.setTimeout(function () {
                var div = ajouterMessage(trouvee.reponse, 'bot', true);
                noterHistorique({ b: trouvee.id });
                if (iaEnvisageable()) { ajouterBoutonPlusSimple(div, question); }
            }, 200);
            return;
        }

        if (!iaEnvisageable()) {
            window.setTimeout(function () {
                ajouterMessage(repli(question), 'bot', true);
                noterHistorique({ f: question });
            }, 200);
            return;
        }

        var attente = ajouterTexteBot('Je réfléchis… 🐴');
        attente.classList.add('kc-attente');

        demanderIA(question, mode, tours, function (reponse) {
            attente.remove();
            if (reponse) {
                var div = ajouterTexteBot(reponse);
                noterHistorique({ t: reponse });
                if (mode !== 'simplifier') { ajouterBoutonPlusSimple(div, question); }
            } else {
                ajouterMessage(repli(question), 'bot', true);
                noterHistorique({ f: question });
            }
        });
    }

    /** Traite la question saisie dans le champ. */
    function envoyer() {
        var question = elSaisie.value.trim();
        if (!question) { return; }
        elSaisie.value = '';
        traiter(question, 'explication');
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

    /** Sous-titre de l'entête : rappelle la leçon et le mode de fonctionnement. */
    function majSousTitre() {
        var el = document.getElementById('kc-sous');
        if (!el) { return; }
        var page = CONNAISSANCES.detail || CONNAISSANCES.page;
        el.textContent = page && page.titre
            ? page.titre
            : 'Toutes les matières';
    }

    /** Regarnit les suggestions avec les notions de la page. */
    function majSuggestions() {
        var conteneur = document.getElementById('kc-suggestions');
        if (!conteneur) { return; }
        conteneur.textContent = '';

        suggestions().forEach(function (texte) {
            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'kc-sug';
            b.textContent = texte;
            b.addEventListener('click', function () {
                traiter(texte, 'explication');
                elSaisie.focus();
            });
            conteneur.appendChild(b);
        });
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
        sous.id = 'kc-sous';
        sous.className = 'kc-sous';
        sous.textContent = 'Chargement…';
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

        // Suggestions cliquables (regarnies une fois la page connue)
        var sugs = document.createElement('div');
        sugs.id = 'kc-suggestions';
        sugs.setAttribute('aria-label', 'Suggestions de questions');

        // Deux actions réclamées : la fiche de révision et l'aide sur un exercice.
        var actions = document.createElement('div');
        actions.id = 'kc-actions';
        [
            { libelle: '📝 Fiche de révision', mode: 'fiche',
              question: 'Fais-moi la fiche de révision de cette page' },
            { libelle: '🧮 Aide sur un exercice', mode: 'exercice',
              question: 'Aide-moi sur un exercice de cette leçon' },
            { libelle: '🎯 Interroge-moi', mode: 'quiz',
              question: 'Interroge-moi sur cette leçon' },
            { libelle: '📊 Où j\'en suis ?', mode: 'progression',
              question: 'Où j\'en suis dans mes révisions ?' }
        ].forEach(function (action) {
            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'kc-action';
            b.textContent = action.libelle;
            b.addEventListener('click', function () {
                if (!elFenetre.classList.contains('kc-ouvert')) { ouvrir(); }
                traiter(action.question, action.mode);
            });
            actions.appendChild(b);
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
        elFenetre.appendChild(actions);
        elFenetre.appendChild(sugs);
        elFenetre.appendChild(form);

        document.body.appendChild(elBulle);
        document.body.appendChild(elFenetre);

        // Les connaissances de la page arrivent de façon asynchrone : on affiche
        // d'abord une fenêtre utilisable, puis on la personnalise à l'arrivée.
        chargerConnaissances(function () {
            majSousTitre();
            majSuggestions();

            // L'historique dépend des entrées de la page (les réponses stockées
            // sont rejouées depuis leur id), il faut donc attendre ce moment.
            if (!restaurerHistorique()) {
                ajouterMessage(accueil(), 'bot', true);
            }
        });

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
        base: BASE,
        // Utiles pour vérifier depuis la console qu'une page est bien reconnue.
        contexte: CONNAISSANCES,
        fiche: ficheDeRevision,
        quiz: poserQuestion,
        bilan: bilanProgression
    };
})();
