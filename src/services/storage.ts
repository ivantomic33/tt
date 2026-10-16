import { Category, Tag, Post, Comment, User, NewsletterSubscriber, SiteSettings, AdminStats, ReactionType, ReactionCounts, UserReactions } from '../types';
import { supabase } from '../lib/supabase';
import { CmsClient } from './cmsClient';

const STORAGE_KEYS = {
  POSTS: 'nexus_gaming_posts_v1',
  CATEGORIES: 'nexus_gaming_categories_v1',
  TAGS: 'nexus_gaming_tags_v1',
  COMMENTS: 'nexus_gaming_comments_v1',
  SUBSCRIBERS: 'nexus_gaming_subscribers_v1',
  SETTINGS: 'nexus_gaming_settings_v1',
  BOOKMARKS: 'nexus_gaming_bookmarks_v1',
  AUTH: 'nexus_gaming_auth_v1',
  REACTIONS: 'nexus_gaming_reactions_v2',
  REPORTS: 'nexus_gaming_reports_v1',
};


export const INITIAL_CATEGORIES: Category[] = [
  { id: 1, name: 'PC Gaming', slug: 'pc', color: '#22d3ee', description: 'Najnovije vesti, hardver optimizacije, drajveri i modovi za PC igrače' },
  { id: 2, name: 'PlayStation', slug: 'playstation', color: '#3b82f6', description: 'Ekskluzive, PS5 Pro ažuriranja i budućnost Sony gejming ekosistema' },
  { id: 3, name: 'Xbox', slug: 'xbox', color: '#22c55e', description: 'Xbox Game Pass naslovi, studio akvizicije i Xbox Series novosti' },
  { id: 4, name: 'Nintendo', slug: 'nintendo', color: '#ef4444', description: 'Switch novosti, najave igara i detalji o nasledniku hibridne konzole' },
  { id: 5, name: 'Esports', slug: 'esports', color: '#f59e0b', description: 'CS2, LoL, Valorant turniri, transferi timova i šampionati' },
  { id: 6, name: 'Recenzije', slug: 'recenzije', color: '#a855f7', description: 'Detaljne i nepristrasne ocene najvećih AAA i indie igara godine' },
  { id: 7, name: 'Tehnologija', slug: 'tehnologija', color: '#06b6d4', description: 'Nvidia i AMD grafičke karte, OLED monitori i gaming oprema' },
];

export const INITIAL_TAGS: Tag[] = [
  { id: 1, name: 'Unreal Engine 5', slug: 'ue5' },
  { id: 2, name: 'Open World', slug: 'open-world' },
  { id: 3, name: 'RPG', slug: 'rpg' },
  { id: 4, name: 'Ray Tracing', slug: 'ray-tracing' },
  { id: 5, name: 'FPS', slug: 'fps' },
  { id: 6, name: 'Souls-like', slug: 'souls-like' },
  { id: 7, name: 'Cyberpunk', slug: 'cyberpunk' },
  { id: 8, name: 'GTA', slug: 'gta' },
  { id: 9, name: 'Indie', slug: 'indie' },
  { id: 10, name: 'Hardware', slug: 'hardware' },
];

const DEFAULT_AUTHOR = {
  id: 'usr_admin_1',
  name: 'Ivan Tomić',
  role: 'Glavni Urednik',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
};

export const INITIAL_POSTS: Post[] = [
  {
    id: 1,
    title: 'Grand Theft Auto VI: Novi detalji o mapi, fizici vode i dinamičkim misijama',
    slug: 'grand-theft-auto-vi-novi-detalji-o-mapi-i-mehanikama',
    excerpt: 'Rockstar Games priprema dosad neviđen nivo interaktivnosti u Leonidi. Otkriveni su podaci o simulaciji gustine saobraćaja i naprednoj AI policiji.',
    content: `<h2>Revolucija u simulaciji otvorenog sveta</h2>
<p>Grand Theft Auto VI obećava da redefiniše žanr akcionih igara u otvorenom svetu. Najnoviji tehnički izveštaji otkrivaju kako Rockstar North i povezani studiji koriste napredne algoritme za simulaciju ponašanja civila u Leonidi (fiktivnoj Floridi).</p>
<p>Za razliku od prethodnika, svaki NPC u GTA VI imaće dinamičan raspored dnevnih aktivnosti, različite nivoe reakcije na incidente i autentičan odgovor na klimatske nepogode koje često pogađaju Vice City i okolne močvarne predele.</p>
<blockquote>"Cilj nam je bio da Vice City ne izgleda kao scenografija, već kao živ ekosistem koji diše nezavisno od toga gde se igrač u datom trenutku nalazi."</blockquote>
<h3>Šta donosi unapređeni RAGE endžin?</h3>
<p>Pored poboljšanog volumetrijskog osvetljenja i globalne iluminacije u realnom vremenu, fizika vode doživela je kompletan redizajn. Talasi, dubina reka i ponašanje plovila podložni su promenama u vetru i strujama, što će vožnju gliserima učiniti pravim izazovom.</p>
<ul>
<li><strong>Vice City metropola:</strong> Preko 70% zgrada sa enterijerima u koje je moguće ući bez loading ekrana.</li>
<li><strong>Dualni protagonisti:</strong> Besprekorna tranzicija između Lucije i Džejsona tokom taktičkih pljački.</li>
<li><strong>Sistem inventara:</strong> Realističnije nošenje oružja, inspirisano mehanikom gepeka iz Red Dead Redemption 2.</li>
</ul>
<p>Izlazak se očekuje u drugom kvartalu 2026. godine za PlayStation 5 i Xbox Series konzole, dok će PC verzija verovatno uslediti naknadno, u skladu sa dosadašnjom Rockstarovom tradicijom.</p>`,
    cover_image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80',
    category_id: 2,
    category: INITIAL_CATEGORIES[1],
    author: DEFAULT_AUTHOR,
    status: 'published',
    views: 4890,
    likes: 342,
    reading_time: 5,
    featured: true,
    tags: [INITIAL_TAGS[1], INITIAL_TAGS[7], INITIAL_TAGS[3]],
    created_at: '2026-10-10T14:30:00Z',
    updated_at: '2026-10-10T14:30:00Z',
    published_at: '2026-10-10T14:30:00Z',
  },
  {
    id: 2,
    title: 'Cyberpunk 2077 nastavak (Project Orion) ulazi u punu fazu produkcije',
    slug: 'cyberpunk-2077-nastavak-project-orion-produkcija',
    excerpt: 'CD Projekt Red Boston studio objavio je da je konceptualna faza završena i da Unreal Engine 5 pruža neviđene mogućnosti za Night City.',
    content: `<h2>Nova era u Unreal Engine 5</h2>
<p>Nakon uspeha ekspanzije Phantom Liberty, poljski gigant CD Projekt Red zvanično je prebacio svoj severnoamerički studio u Bostonu u punu produkciju nastavka kodnog imena <em>Project Orion</em>.</p>
<p>Prelazak sa internog REDengine-a na Epic Games-ov Unreal Engine 5 omogućio je timu da se fokusira na narativne grananja i kompleksnost vertikalnog kretanja kroz megastrukture Night Cityja bez dugotrajnog održavanja sopstvene bazične tehnologije.</p>
<blockquote>"Phantom Liberty nam je dokazao kakav potencijal svet Cyberpunka zapravo poseduje kada se narativ i mehanika sretnu u savršenoj sinergiji."</blockquote>
<h3>Ključna unapređenja koja igrači mogu očekivati:</h3>
<p>Glavni fokus stavljen je na reaktivnost sveta, poboljšanu veštačku inteligenciju bandi i korporativnih jedinica MaxTac-a, kao i na dublju integraciju kibernetičkih implanata sa psihološkim stanjem karaktera.</p>`,
    cover_image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80',
    category_id: 1,
    category: INITIAL_CATEGORIES[0],
    author: DEFAULT_AUTHOR,
    status: 'published',
    views: 3120,
    likes: 218,
    reading_time: 4,
    featured: false,
    tags: [INITIAL_TAGS[0], INITIAL_TAGS[2], INITIAL_TAGS[6]],
    created_at: '2026-10-11T09:15:00Z',
    updated_at: '2026-10-11T09:15:00Z',
    published_at: '2026-10-11T09:15:00Z',
  },
  {
    id: 3,
    title: 'PlayStation 6 specifikacije: RDNA 5 arhitektura i napredni Neural AI Upscaler',
    slug: 'playstation-6-specifikacije-rdna-5-ai-upscaler',
    excerpt: 'Insajderi industrije otkrivaju prve detalje o hardveru buduće Sony platforme, sa posebnim naglaskom na 4K 120FPS i hibridni ray tracing.',
    content: `<h2>Hardverski skok u 2027/2028.</h2>
<p>Iako je PS5 Pro relativno nedavno stupio na tržište sa PSSR tehnologijom, Sony u partnerstvu sa kompanijom AMD već uveliko radi na silicijumu sledeće generacije pod kodnim imenom za PlayStation 6.</p>
<p>Prema najnovijim patentima i podacima lanaca snabdevanja, nova konzola koristiće prilagođeni AMD Zen 6 procesor uparen sa RDNA 5 grafičkom arhitekturom i namenskim NPU blokom za mašinsko učenje.</p>
<h3>Tehnički stubovi nove arhitekture:</h3>
<ul>
<li><strong>Target performansi:</strong> Nativnih 4K rezolucija pri stabilnih 120 FPS uz puni path-tracing.</li>
<li><strong>Neural Cache:</strong> Eliminacija teksturnog pop-ina korišćenjem prediktivnog keširanja.</li>
<li><strong>Potpuna kompatibilnost:</strong> Podrška unazad za čitavu PS4 i PS5 digitalnu biblioteku.</li>
</ul>`,
    cover_image: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=1200&q=80',
    category_id: 2,
    category: INITIAL_CATEGORIES[1],
    author: DEFAULT_AUTHOR,
    status: 'published',
    views: 2940,
    likes: 195,
    reading_time: 4,
    featured: false,
    tags: [INITIAL_TAGS[3], INITIAL_TAGS[9]],
    created_at: '2026-10-11T16:00:00Z',
    updated_at: '2026-10-11T16:00:00Z',
    published_at: '2026-10-11T16:00:00Z',
  },
  {
    id: 4,
    title: 'Counter-Strike 2 Major šampionat: Istorijsko finale i rekordi gledanosti',
    slug: 'cs2-major-finale-istorijski-milenijum-gledanosti',
    excerpt: 'Preko 1.8 miliona istovremenih gledalaca pratilo je napetu završnicu u pet mapa, potvrđujući status CS2 kao kralja takmičarskog gejminga.',
    content: `<h2>Trijumf taktike i individualnog majstorstva</h2>
<p>Završen je jesenji Counter-Strike 2 Major šampionat spektakularnom finalnom serijom koja je oborila rekorde gledanosti na Twitch i YouTube platformama.</p>
<p>Finale je trajalo punih pet sati, odigrano na svih pet mapa (Mirage, Inferno, Nuke, Anubis i odlučujući Ancient), gde su se timovi borili za nagradni fond od 1.250.000 dolara.</p>
<p>Sub-tick ažuriranja koja je Valve implementirao prethodnog meseca pokazala su se ključnim za fluidnost okršaja, a komentatorski duo istakao je da igra konačno deluje potpuno zrelo na najvišem takmičarskom nivou.</p>`,
    cover_image: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80',
    category_id: 5,
    category: INITIAL_CATEGORIES[4],
    author: DEFAULT_AUTHOR,
    status: 'published',
    views: 2450,
    likes: 180,
    reading_time: 3,
    featured: false,
    tags: [INITIAL_TAGS[4]],
    created_at: '2026-10-12T11:20:00Z',
    updated_at: '2026-10-12T11:20:00Z',
    published_at: '2026-10-12T11:20:00Z',
  },
  {
    id: 5,
    title: 'Recenzija: Elden Ring: Shadow of the Erdtree Definitive Edition (Ocena 9.8/10)',
    slug: 'recenzija-elden-ring-shadow-erdtree-definitive-edition',
    excerpt: 'FromSoftware još jednom postavlja zlatni standard u dizajnu nivoa, atmosferi i borbenim izazovima. Remek-delo koje se ne zaboravlja.',
    content: `<h2>Vrhunac modernog akcionog RPG dizajna</h2>
<p>Definitive izdanje FromSoftware-ovog remek-dela sa svim zakrpama i balansnim prilagođavanjima donosi najkompletnije iskustvo u istoriji studija.</p>
<p>Zemlja senke (Realm of Shadow) nudi vertikalnost koja nadmašuje čak i osnovnu igru, sa tajnama koje povezuju skrivene ruševine sa podzemnim katakombama na način koji deluje potpuno prirodno.</p>
<h3>Zašto je igra zaslužila ocenu 9.8:</h3>
<ul>
<li><strong>Borba:</strong> Nova oružja (poput martial arts pesnica i lakih mačeva) pružaju svežinu u svakom susretu.</li>
<li><strong>Muzička podloga:</strong> Orkestarske kompozicije koje podižu napetost tokom svakog boss okršaja do usijanja.</li>
<li><strong>Umetnički pravac:</strong> Vizuelni pejzaži koji oduzimaju dah pri svakom izlasku na novi greben.</li>
</ul>`,
    cover_image: 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?auto=format&fit=crop&w=1200&q=80',
    category_id: 6,
    category: INITIAL_CATEGORIES[5],
    author: DEFAULT_AUTHOR,
    status: 'published',
    views: 4120,
    likes: 310,
    reading_time: 6,
    featured: false,
    tags: [INITIAL_TAGS[2], INITIAL_TAGS[5]],
    created_at: '2026-10-12T17:45:00Z',
    updated_at: '2026-10-12T17:45:00Z',
    published_at: '2026-10-12T17:45:00Z',
  },
  {
    id: 6,
    title: 'Nintendo Switch 2: Puna kompatibilnost unazad i OLED ekran od 8 inča potvrđeni',
    slug: 'nintendo-switch-2-kompatibilnost-oled-ekran',
    excerpt: 'Nintendo je tokom brifinga sa investitorima potvrdio da će postojeći Switch nalozi i fizički kertridži raditi na novoj konzoli bez ikakvih prepreka.',
    content: `<h2>Očuvanje postojeće biblioteke igara</h2>
<p>Predsednik Nintenda Shuntaro Furukawa obradovao je milione igrača zvaničnom potvrdom da će sledeći hardverski uređaj podržavati Nintendo Account ekosistem i postojeću biblioteku softvera.</p>
<p>Prema izvorima bliskim proizvođačima ekrana u Japanu, uređaj će u prvoj verziji nuditi prilagođeni 1080p 120Hz ekran sa VRR podrškom, dok će u dock režimu preko Nvidia DLSS tehnologije isporučivati čist 4K signal na televizore.</p>`,
    cover_image: 'https://images.unsplash.com/photo-1578303512597-81e6cc155b3e?auto=format&fit=crop&w=1200&q=80',
    category_id: 4,
    category: INITIAL_CATEGORIES[3],
    author: DEFAULT_AUTHOR,
    status: 'published',
    views: 3780,
    likes: 276,
    reading_time: 3,
    featured: false,
    tags: [INITIAL_TAGS[9]],
    created_at: '2026-10-13T08:00:00Z',
    updated_at: '2026-10-13T08:00:00Z',
    published_at: '2026-10-13T08:00:00Z',
  },
  {
    id: 7,
    title: 'GeForce RTX 5080 i 5090: Blackwell gejming arhitektura donosi 2x ray-tracing skok',
    slug: 'geforce-rtx-5080-5090-blackwell-arhitektura',
    excerpt: 'Nova generacija grafičkih kartica prelazi na GDDR7 memoriju i četvrtu generaciju Tensor jezgara sa podrškom za puni DLSS 4.',
    content: `<h2>Granice fotorealizma se pomeraju</h2>
<p>Nvidia se priprema za lansiranje Blackwell serije grafičkih kartica namenjenih entuzijastima. RTX 5090 predvodi flotu sa čak 32 GB super-brze GDDR7 memorije i magistralom od 512 bita.</p>
<p>Prema ranim laboratorijskim testovima u igrama poput Cyberpunk 2077 i Alan Wake 2 sa maksimalnim path tracing podešavanjima, framerate je dvostruko viši u poređenju sa RTX 4090, uz manju potrošnju po renderovanom frejmu.</p>`,
    cover_image: 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=1200&q=80',
    category_id: 7,
    category: INITIAL_CATEGORIES[6],
    author: DEFAULT_AUTHOR,
    status: 'published',
    views: 2890,
    likes: 194,
    reading_time: 4,
    featured: false,
    tags: [INITIAL_TAGS[3], INITIAL_TAGS[9]],
    created_at: '2026-10-13T10:15:00Z',
    updated_at: '2026-10-13T10:15:00Z',
    published_at: '2026-10-13T10:15:00Z',
  },
  {
    id: 8,
    title: 'Xbox Game Pass u oktobru: Stižu tri ogromna RPG hita i indie biseri',
    slug: 'xbox-game-pass-oktobar-novi-naslovi',
    excerpt: 'Microsoft je predstavio talas novih igara za pretplatnike. Članovi servisa dobijaju pristup novom izdanju Avowed i kultnim klasicima.',
    content: `<h2>Bogat mesec za pretplatnike</h2>
<p>Pretplatni servis Xbox Game Pass Ultimate nastavlja da donosi izuzetnu vrednost. U drugoj polovini ovog meseca biblioteci se pridružuje Obsidianov dugo očekivani fantazijski RPG naslov.</p>
<p>Pored toga, gejmeri mogu isprobati tri nagrađivana indie ostvarenja koja su obeležila proteklu festivalsku sezonu na Steamu.</p>`,
    cover_image: 'https://images.unsplash.com/photo-1605901309584-818e25960a8f?auto=format&fit=crop&w=1200&q=80',
    category_id: 3,
    category: INITIAL_CATEGORIES[2],
    author: DEFAULT_AUTHOR,
    status: 'draft',
    views: 120,
    likes: 15,
    reading_time: 3,
    featured: false,
    tags: [INITIAL_TAGS[2], INITIAL_TAGS[8]],
    created_at: '2026-10-13T12:00:00Z',
    updated_at: '2026-10-13T12:00:00Z',
    published_at: '2026-10-13T12:00:00Z',
  },
];

export const INITIAL_COMMENTS: Comment[] = [
  {
    id: 'comm_1',
    post_id: 1,
    author_name: 'Marko_Gamer',
    author_email: 'marko@example.com',
    content: 'Ako zaista omoguće ulazak u preko 70% zgrada, ovo će promeniti industriju za narednih 10 godina. Jedva čekam!',
    status: 'approved',
    created_at: '2026-10-10T16:20:00Z',
    likes: 14,
  },
  {
    id: 'comm_2',
    post_id: 1,
    author_name: 'Nikola_RS',
    author_email: 'nikola@example.com',
    content: 'Nadam se samo da optimizacija neće stradati na konzolama, fizika vode na snimcima izgleda neverovatno.',
    status: 'approved',
    created_at: '2026-10-10T18:45:00Z',
    likes: 8,
  },
  {
    id: 'comm_3',
    post_id: 5,
    author_name: 'SoulsVeteran',
    author_email: 'souls@example.com',
    content: 'Apsolutno zaslužena ocena 9.8. Borba sa završnim bossom me je namučila više od Malenije, savršen dlc.',
    status: 'approved',
    created_at: '2026-10-12T19:10:00Z',
    likes: 19,
  },
  {
    id: 'comm_4',
    post_id: 2,
    author_name: 'CyberFanatic',
    author_email: 'fan@example.com',
    content: 'Prelazak na UE5 je bio pametan potez, Phantom Liberty je bio vrhunski ali je REDengine imao previše limitacija.',
    status: 'pending',
    created_at: '2026-10-13T11:05:00Z',
    likes: 2,
  },
];

export const INITIAL_SUBSCRIBERS: NewsletterSubscriber[] = [
  { id: 'sub_1', email: 'gamer99@gmail.com', subscribed_at: '2026-10-01T12:00:00Z', active: true },
  { id: 'sub_2', email: 'stefan.tech@outlook.com', subscribed_at: '2026-10-05T14:30:00Z', active: true },
  { id: 'sub_3', email: 'esports_balkan@yahoo.com', subscribed_at: '2026-10-09T09:15:00Z', active: true },
];

export const INITIAL_SETTINGS: SiteSettings = {
  siteName: 'NEXUS GAMING',
  tagline: 'Vodeći portal za gaming vesti, hardver i recenzije na Balkanu',
  description: 'Nezavisni portal posvećen video igrama, hardverskim inovacijama, esportu i industriji zabave.',
  contactEmail: 'redakcija@nexusgaming.gg',
  socialLinks: {
    twitter: 'https://twitter.com/nexusgaming',
    discord: 'https://discord.gg/nexusgaming',
    youtube: 'https://youtube.com/@nexusgaming',
    steam: 'https://steamcommunity.com/groups/nexusgaming',
    twitch: 'https://twitch.tv/nexusgaming',
  },
};

export const INITIAL_ADMIN_USER: User = {
  id: 'usr_admin_1',
  email: 'admin@gamingnews.gg',
  name: 'Ivan Tomić',
  role: 'admin',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
};

// Storage API Helpers
function safeGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    console.error(`Error reading key ${key} from storage:`, e);
    return fallback;
  }
}

function safeSet<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error(`Error writing key ${key} to storage:`, e);
  }
}

export const StorageService = {
  // Supabase singleton client instance
  getSupabase() {
    return supabase;
  },

  // Test connection to Supabase
  async testSupabaseConnection(): Promise<{ success: boolean; message: string; tablesFound: boolean }> {
    try {
      const sb = this.getSupabase();
      if (!sb) {
        return {
          success: false,
          tablesFound: false,
          message: 'Supabase URL ili ključ nije podešen ili je neispravan u konfiguraciji.',
        };
      }
      const { data, error } = await sb.from('posts').select('id').limit(1);
      if (error) {
        if (
          error.code === '42P01' ||
          error.message.includes('does not exist') ||
          error.message.includes('not found')
        ) {
          return {
            success: false,
            tablesFound: false,
            message: 'Povezano sa Supabase servisom, ali tabela "posts" još nije kreirana. Pokrenite SQL skriptu iz supabase/schema.sql u Supabase SQL Editor-u.',
          };
        }
        return { success: false, tablesFound: false, message: `Greška pri upitu: ${error.message}` };
      }
      return {
        success: true,
        tablesFound: true,
        message: 'Konekcija sa Supabase bazom je aktivna! Tabele su pronađene i spremne za rad.',
      };
    } catch (e: any) {
      return { success: false, tablesFound: false, message: `Greška u konekciji: ${e?.message || e}` };
    }
  },

  // Pull remote posts and categories from Supabase
  async syncFromSupabase(): Promise<{ success: boolean; count: number; message: string }> {
    try {
      const sb = this.getSupabase();
      if (!sb) {
        return {
          success: false,
          count: 0,
          message: 'Supabase klijent nije inicijalizovan (proverite VITE_SUPABASE_URL i VITE_SUPABASE_PUBLISHABLE_KEY).',
        };
      }
      const { data: remotePosts, error } = await sb
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        return { success: false, count: 0, message: error.message };
      }

      if (remotePosts && remotePosts.length > 0) {
        const categories = this.getCategories();
        const mappedPosts: Post[] = remotePosts.map((rp: any) => ({
          id: rp.id,
          title: rp.title,
          slug: rp.slug,
          excerpt: rp.excerpt || '',
          content: rp.content,
          cover_image: rp.cover_image,
          category_id: rp.category_id,
          category: categories.find(c => c.id === rp.category_id) || categories[0],
          author: {
            id: 'author_1',
            name: rp.author_name || 'Ivan Tomić',
            role: rp.author_role || 'Glavni Urednik',
            avatar: rp.author_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
          },
          status: rp.status || 'published',
          views: rp.views || 0,
          likes: rp.likes || 0,
          reading_time: rp.reading_time || 4,
          featured: rp.featured || false,
          tags: [],
          created_at: rp.created_at,
          updated_at: rp.updated_at,
          published_at: rp.published_at,
        }));

        safeSet(STORAGE_KEYS.POSTS, mappedPosts);
        return {
          success: true,
          count: mappedPosts.length,
          message: `Uspešno sinhronizovano ${mappedPosts.length} vesti iz Supabase baze!`,
        };
      }

      return {
        success: true,
        count: 0,
        message: 'Konekcija uspešna, ali tabela "posts" u Supabase bazi je trenutno prazna.',
      };
    } catch (e: any) {
      return { success: false, count: 0, message: e?.message || 'Greška tokom sinhronizacije' };
    }
  },

  // Initialization
  init() {
    // Purge 'AwpMaster99' from localStorage completely as this user no longer exists in DB
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const val = localStorage.getItem(key);
          if (val && (val.includes('AwpMaster99') || key.includes('AwpMaster99'))) {
            keysToRemove.push(key);
          }
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch (e) {}

    if (!localStorage.getItem(STORAGE_KEYS.POSTS)) {
      safeSet(STORAGE_KEYS.POSTS, INITIAL_POSTS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.CATEGORIES)) {
      safeSet(STORAGE_KEYS.CATEGORIES, INITIAL_CATEGORIES);
    }
    if (!localStorage.getItem(STORAGE_KEYS.TAGS)) {
      safeSet(STORAGE_KEYS.TAGS, INITIAL_TAGS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.COMMENTS)) {
      safeSet(STORAGE_KEYS.COMMENTS, INITIAL_COMMENTS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.SUBSCRIBERS)) {
      safeSet(STORAGE_KEYS.SUBSCRIBERS, INITIAL_SUBSCRIBERS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
      safeSet(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.BOOKMARKS)) {
      safeSet(STORAGE_KEYS.BOOKMARKS, []);
    }
  },

  // Posts
  getPosts(options?: {
    categorySlug?: string;
    tagSlug?: string;
    status?: 'published' | 'draft' | 'all';
    search?: string;
    limit?: number;
    sortBy?: 'newest' | 'views' | 'likes';
  }): Post[] {
    this.init();
    let posts = safeGet<Post[]>(STORAGE_KEYS.POSTS, INITIAL_POSTS);

    if (options?.status && options.status !== 'all') {
      posts = posts.filter(p => p.status === options.status);
    }

    if (options?.categorySlug) {
      posts = posts.filter(p => p.category.slug === options.categorySlug);
    }

    if (options?.tagSlug) {
      posts = posts.filter(p => p.tags.some(t => t.slug === options.tagSlug));
    }

    if (options?.search) {
      const q = options.search.toLowerCase().trim();
      posts = posts.filter(
        p =>
          p.title.toLowerCase().includes(q) ||
          p.excerpt.toLowerCase().includes(q) ||
          p.content.toLowerCase().includes(q) ||
          p.category.name.toLowerCase().includes(q) ||
          p.tags.some(t => t.name.toLowerCase().includes(q))
      );
    }

    if (options?.sortBy === 'views') {
      posts.sort((a, b) => b.views - a.views);
    } else if (options?.sortBy === 'likes') {
      posts.sort((a, b) => b.likes - a.likes);
    } else {
      // newest by published_at or created_at
      posts.sort((a, b) => new Date(b.published_at || b.created_at).getTime() - new Date(a.published_at || a.created_at).getTime());
    }

    if (options?.limit) {
      posts = posts.slice(0, options.limit);
    }

    return posts;
  },

  getPostBySlug(slug: string): Post | undefined {
    this.init();
    const posts = safeGet<Post[]>(STORAGE_KEYS.POSTS, INITIAL_POSTS);
    return posts.find(p => p.slug === slug);
  },

  getPostById(id: number): Post | undefined {
    this.init();
    const posts = safeGet<Post[]>(STORAGE_KEYS.POSTS, INITIAL_POSTS);
    return posts.find(p => p.id === id);
  },

  createPost(postData: Omit<Post, 'id' | 'created_at' | 'updated_at' | 'views' | 'likes'>): Post {
    this.init();
    const posts = safeGet<Post[]>(STORAGE_KEYS.POSTS, INITIAL_POSTS);
    const maxId = posts.reduce((max, p) => (p.id > max ? p.id : max), 0);
    const now = new Date().toISOString();

    const newPost: Post = {
      ...postData,
      id: maxId + 1,
      views: 0,
      likes: 0,
      created_at: now,
      updated_at: now,
      published_at: postData.status === 'published' ? now : '',
    };

    posts.unshift(newPost);
    safeSet(STORAGE_KEYS.POSTS, posts);

    // Sinhronizacija preko autentifikovanog CMS API-ja (service_role na serveru).
    CmsClient.upsertPost({
      title: newPost.title,
      slug: newPost.slug,
      excerpt: newPost.excerpt,
      content: newPost.content,
      cover_image: newPost.cover_image,
      category_id: newPost.category_id,
      status: newPost.status,
      views: 0,
      likes: 0,
      reading_time: newPost.reading_time,
      featured: newPost.featured,
      updated_at: newPost.updated_at || new Date().toISOString(),
      published_at: newPost.published_at || new Date().toISOString(),
      author_name: newPost.author?.name || 'Nexus Autor',
      author_role: newPost.author?.role || 'Autor',
      author_avatar: newPost.author?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
    });

    return newPost;
  },

  updatePost(id: number, update: Partial<Post>): Post | null {
    this.init();
    const posts = safeGet<Post[]>(STORAGE_KEYS.POSTS, INITIAL_POSTS);
    const index = posts.findIndex(p => p.id === id);
    if (index === -1) return null;

    const existing = posts[index];
    const now = new Date().toISOString();

    const updated: Post = {
      ...existing,
      ...update,
      updated_at: now,
      published_at:
        update.status === 'published' && !existing.published_at
          ? now
          : update.published_at || existing.published_at,
    };

    posts[index] = updated;
    safeSet(STORAGE_KEYS.POSTS, posts);

    // Sinhronizacija preko autentifikovanog CMS API-ja.
    CmsClient.updatePost(id, {
      title: updated.title,
      slug: updated.slug,
      excerpt: updated.excerpt,
      content: updated.content,
      cover_image: updated.cover_image,
      category_id: updated.category_id,
      status: updated.status,
      views: updated.views,
      likes: updated.likes,
      reading_time: updated.reading_time,
      featured: updated.featured,
      published_at: updated.published_at || new Date().toISOString(),
      author_name: updated.author?.name,
      author_role: updated.author?.role,
      author_avatar: updated.author?.avatar,
    });

    return updated;
  },

  deletePost(id: number): boolean {
    this.init();
    let posts = safeGet<Post[]>(STORAGE_KEYS.POSTS, INITIAL_POSTS);
    const initialLen = posts.length;
    posts = posts.filter(p => p.id !== id);
    safeSet(STORAGE_KEYS.POSTS, posts);

    CmsClient.deletePost(id);

    return posts.length !== initialLen;
  },

  incrementViews(id: number): void {
    this.init();
    const posts = safeGet<Post[]>(STORAGE_KEYS.POSTS, INITIAL_POSTS);
    const post = posts.find(p => p.id === id);
    if (post) {
      post.views += 1;
      safeSet(STORAGE_KEYS.POSTS, posts);

      // Javni, rate-limited endpoint (server inkrementuje preglede).
      CmsClient.incrementViews(id);
    }
  },

  toggleLikePost(id: number): number {
    this.init();
    const posts = safeGet<Post[]>(STORAGE_KEYS.POSTS, INITIAL_POSTS);
    const post = posts.find(p => p.id === id);
    if (!post) return 0;

    const key = `nexus_liked_${id}`;
    const alreadyLiked = localStorage.getItem(key) === 'true';

    if (alreadyLiked) {
      post.likes = Math.max(0, post.likes - 1);
      localStorage.removeItem(key);
    } else {
      post.likes += 1;
      localStorage.setItem(key, 'true');
    }

    safeSet(STORAGE_KEYS.POSTS, posts);

    // Javni, rate-limited endpoint; server inkrementuje/dekrementuje uz pod (min 0).
    CmsClient.toggleLike(id, alreadyLiked ? -1 : 1);

    return post.likes;
  },

  isPostLiked(id: number): boolean {
    return localStorage.getItem(`nexus_liked_${id}`) === 'true';
  },

  // Client identifier for tracking anonymous user reactions across sessions
  getClientId(): string {
    let clientId = localStorage.getItem('nexus_client_id');
    if (!clientId) {
      clientId = 'cli_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
      localStorage.setItem('nexus_client_id', clientId);
    }
    return clientId;
  },

  // Reaction state for a specific post (starts at 0 for all reaction counters on new articles)
  async getPostReactions(
    postId: number,
    clientId?: string
  ): Promise<{ counts: ReactionCounts; userReactions: UserReactions }> {
    const activeClientId = clientId || this.getClientId();

    try {
      // Fetch directly from server API if available
      const res = await fetch(`/api/posts/${postId}/reactions?clientId=${encodeURIComponent(activeClientId)}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.counts) {
          return {
            counts: {
              like: json.counts.like || 0,
              gg: json.counts.gg || 0,
              hype: json.counts.hype || 0,
            },
            userReactions: {
              like: Boolean(json.userReactions?.like),
              gg: Boolean(json.userReactions?.gg),
              hype: Boolean(json.userReactions?.hype),
            },
          };
        }
      }
    } catch (e) {
      // Fallback to local storage
    }

    // Local storage fallback for reactions
    const allReactions = safeGet<Array<{ postId: number; type: ReactionType; clientId: string }>>(
      STORAGE_KEYS.REACTIONS,
      []
    );

    const postReactions = allReactions.filter(r => r.postId === postId);
    const counts: ReactionCounts = { like: 0, gg: 0, hype: 0 };
    const userReactions: UserReactions = { like: false, gg: false, hype: false };

    postReactions.forEach(r => {
      if (counts[r.type] !== undefined) counts[r.type]++;
      if (r.clientId === activeClientId && userReactions[r.type] !== undefined) {
        userReactions[r.type] = true;
      }
    });

    return { counts, userReactions };
  },

  async togglePostReaction(
    postId: number,
    reactionType: ReactionType,
    clientId?: string
  ): Promise<{ action: 'added' | 'removed'; counts: ReactionCounts; userReactions: UserReactions }> {
    const activeClientId = clientId || this.getClientId();

    try {
      const res = await fetch(`/api/posts/${postId}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reactionType, clientId: activeClientId }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          return {
            action: json.action,
            counts: json.counts,
            userReactions: json.userReactions,
          };
        }
      }
    } catch (e) {
      // Local storage fallback
    }

    // Fallback local handling
    const allReactions = safeGet<Array<{ postId: number; type: ReactionType; clientId: string }>>(
      STORAGE_KEYS.REACTIONS,
      []
    );

    const existingIdx = allReactions.findIndex(
      r => r.postId === postId && r.type === reactionType && r.clientId === activeClientId
    );

    let action: 'added' | 'removed' = 'added';
    if (existingIdx >= 0) {
      allReactions.splice(existingIdx, 1);
      action = 'removed';
    } else {
      allReactions.push({ postId, type: reactionType, clientId: activeClientId });
      action = 'added';
    }

    safeSet(STORAGE_KEYS.REACTIONS, allReactions);

    // Compute updated state
    const postReactions = allReactions.filter(r => r.postId === postId);
    const counts: ReactionCounts = { like: 0, gg: 0, hype: 0 };
    const userReactions: UserReactions = { like: false, gg: false, hype: false };

    postReactions.forEach(r => {
      if (counts[r.type] !== undefined) counts[r.type]++;
      if (r.clientId === activeClientId && userReactions[r.type] !== undefined) {
        userReactions[r.type] = true;
      }
    });

    // Notify other tabs via BroadcastChannel if available
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel('nexus_reactions_channel');
        bc.postMessage({
          type: 'reaction_updated',
          postId,
          counts,
          triggeringClientId: activeClientId,
          reactionType,
          action,
          timestamp: new Date().toISOString(),
        });
        bc.close();
      }
    } catch (bcErr) {
      // ignore
    }

    return { action, counts, userReactions };
  },


  // Categories
  getCategories(): Category[] {
    this.init();
    const cats = safeGet<Category[]>(STORAGE_KEYS.CATEGORIES, INITIAL_CATEGORIES);
    const posts = safeGet<Post[]>(STORAGE_KEYS.POSTS, INITIAL_POSTS);
    return cats.map(c => ({
      ...c,
      postCount: posts.filter(p => p.category_id === c.id && p.status === 'published').length,
    }));
  },

  getCategoryBySlug(slug: string): Category | undefined {
    return this.getCategories().find(c => c.slug === slug);
  },

  createCategory(cat: Omit<Category, 'id' | 'postCount'>): Category {
    this.init();
    const cats = safeGet<Category[]>(STORAGE_KEYS.CATEGORIES, INITIAL_CATEGORIES);
    const maxId = cats.reduce((max, c) => (c.id > max ? c.id : max), 0);
    const newCat: Category = {
      ...cat,
      id: maxId + 1,
      postCount: 0,
    };
    cats.push(newCat);
    safeSet(STORAGE_KEYS.CATEGORIES, cats);

    CmsClient.upsertCategory({
      name: newCat.name,
      slug: newCat.slug,
      color: newCat.color || '#a855f7',
      description: newCat.description || '',
    });

    return newCat;
  },

  updateCategory(id: number, cat: Partial<Category>): Category | null {
    this.init();
    const cats = safeGet<Category[]>(STORAGE_KEYS.CATEGORIES, INITIAL_CATEGORIES);
    const idx = cats.findIndex(c => c.id === id);
    if (idx === -1) return null;
    cats[idx] = { ...cats[idx], ...cat };
    safeSet(STORAGE_KEYS.CATEGORIES, cats);

    const updatePayload: Record<string, any> = {};
    if (cat.name !== undefined) updatePayload.name = cat.name;
    if (cat.slug !== undefined) updatePayload.slug = cat.slug;
    if (cat.color !== undefined) updatePayload.color = cat.color;
    if (cat.description !== undefined) updatePayload.description = cat.description;

    if (Object.keys(updatePayload).length > 0) {
      CmsClient.updateCategory(id, updatePayload);
    }

    return cats[idx];
  },

  deleteCategory(id: number): boolean {
    this.init();
    let cats = safeGet<Category[]>(STORAGE_KEYS.CATEGORIES, INITIAL_CATEGORIES);
    const initialLen = cats.length;
    cats = cats.filter(c => c.id !== id);
    safeSet(STORAGE_KEYS.CATEGORIES, cats);

    CmsClient.deleteCategory(id);

    return cats.length !== initialLen;
  },

  // Tags
  getTags(): Tag[] {
    this.init();
    return safeGet<Tag[]>(STORAGE_KEYS.TAGS, INITIAL_TAGS);
  },

  createTag(name: string, slug?: string): Tag {
    this.init();
    const tags = safeGet<Tag[]>(STORAGE_KEYS.TAGS, INITIAL_TAGS);
    const generatedSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    const existing = tags.find(t => t.slug === generatedSlug);
    if (existing) return existing;

    const maxId = tags.reduce((max, t) => (t.id > max ? t.id : max), 0);
    const newTag: Tag = {
      id: maxId + 1,
      name,
      slug: generatedSlug,
    };
    tags.push(newTag);
    safeSet(STORAGE_KEYS.TAGS, tags);

    CmsClient.upsertTag({ name: newTag.name, slug: newTag.slug });

    return newTag;
  },

  deleteTag(id: number): boolean {
    this.init();
    let tags = safeGet<Tag[]>(STORAGE_KEYS.TAGS, INITIAL_TAGS);
    const initialLen = tags.length;
    tags = tags.filter(t => t.id !== id);
    safeSet(STORAGE_KEYS.TAGS, tags);

    CmsClient.deleteTag(id);

    return tags.length !== initialLen;
  },

  // Comments
  getComments(postId?: number): Comment[] {
    this.init();
    const comments = safeGet<Comment[]>(STORAGE_KEYS.COMMENTS, INITIAL_COMMENTS);
    if (postId !== undefined) {
      return comments.filter(c => c.post_id === postId);
    }
    return comments;
  },

  addComment(commentData: { post_id: number; author_name: string; author_email: string; content: string }): Comment {
    this.init();
    const comments = safeGet<Comment[]>(STORAGE_KEYS.COMMENTS, INITIAL_COMMENTS);
    const newComment: Comment = {
      id: `comm_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      post_id: commentData.post_id,
      author_name: commentData.author_name,
      author_email: commentData.author_email,
      content: commentData.content,
      status: 'approved', // Auto-approved for high responsiveness, editable in admin
      created_at: new Date().toISOString(),
      likes: 0,
    };
    comments.unshift(newComment);
    safeSet(STORAGE_KEYS.COMMENTS, comments);

    CmsClient.addComment({
      post_id: commentData.post_id,
      author_name: commentData.author_name,
      author_email: commentData.author_email,
      content: commentData.content,
    });

    return newComment;
  },

  updateCommentStatus(id: string, status: 'approved' | 'pending' | 'spam'): boolean {
    this.init();
    const comments = safeGet<Comment[]>(STORAGE_KEYS.COMMENTS, INITIAL_COMMENTS);
    const c = comments.find(comm => comm.id === id);
    if (c) {
      c.status = status;
      safeSet(STORAGE_KEYS.COMMENTS, comments);
      return true;
    }
    return false;
  },

  deleteComment(id: string): boolean {
    this.init();
    let comments = safeGet<Comment[]>(STORAGE_KEYS.COMMENTS, INITIAL_COMMENTS);
    const initialLen = comments.length;
    comments = comments.filter(c => c.id !== id);
    safeSet(STORAGE_KEYS.COMMENTS, comments);
    return comments.length !== initialLen;
  },

  // Bookmarks
  getBookmarks(): number[] {
    this.init();
    return safeGet<number[]>(STORAGE_KEYS.BOOKMARKS, [1, 5]);
  },

  async getBookmarksAsync(): Promise<number[]> {
    return this.getBookmarks();
  },

  toggleBookmark(postId: number): boolean {
    this.init();
    const bookmarks = safeGet<number[]>(STORAGE_KEYS.BOOKMARKS, []);
    const idx = bookmarks.indexOf(postId);
    let isSaved = false;
    if (idx > -1) {
      bookmarks.splice(idx, 1);
      isSaved = false;
    } else {
      bookmarks.unshift(postId);
      isSaved = true;
    }
    safeSet(STORAGE_KEYS.BOOKMARKS, bookmarks);
    return isSaved;
  },

  async toggleBookmarkAsync(postId: number): Promise<boolean> {
    return this.toggleBookmark(postId);
  },

  isBookmarked(postId: number): boolean {
    return this.getBookmarks().includes(postId);
  },

  async isBookmarkedAsync(postId: number): Promise<boolean> {
    return this.isBookmarked(postId);
  },

  /** Postavlja kompletnu listu sačuvanih članaka (npr. sinhronizacija sa bazom). */
  setBookmarks(ids: number[]): void {
    this.init();
    safeSet(STORAGE_KEYS.BOOKMARKS, Array.isArray(ids) ? ids : []);
  },

  // Newsletter
  getSubscribers(): NewsletterSubscriber[] {
    this.init();
    return safeGet<NewsletterSubscriber[]>(STORAGE_KEYS.SUBSCRIBERS, INITIAL_SUBSCRIBERS);
  },

  addSubscriber(email: string): { success: boolean; message: string } {
    this.init();
    const subscribers = safeGet<NewsletterSubscriber[]>(STORAGE_KEYS.SUBSCRIBERS, INITIAL_SUBSCRIBERS);
    const cleanEmail = email.toLowerCase().trim();

    if (subscribers.some(s => s.email.toLowerCase() === cleanEmail)) {
      return { success: false, message: 'Ova email adresa je već prijavljena na newsletter.' };
    }

    subscribers.unshift({
      id: `sub_${Date.now()}`,
      email: cleanEmail,
      subscribed_at: new Date().toISOString(),
      active: true,
    });
    safeSet(STORAGE_KEYS.SUBSCRIBERS, subscribers);

    // Perzistiraj pretplatnika i na serveru (rate-limited, service_role).
    // Fire-and-forget: ne blokira UI niti obara lokalnu prijavu ako server nije dostupan.
    try {
      void fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail }),
      }).catch(() => {});
    } catch {
      /* ignore */
    }

    return { success: true, message: 'Uspešno ste se prijavili na gaming newsletter!' };
  },

  removeSubscriber(id: string): boolean {
    this.init();
    let subs = safeGet<NewsletterSubscriber[]>(STORAGE_KEYS.SUBSCRIBERS, INITIAL_SUBSCRIBERS);
    const initLen = subs.length;
    subs = subs.filter(s => s.id !== id);
    safeSet(STORAGE_KEYS.SUBSCRIBERS, subs);
    return subs.length !== initLen;
  },

  // Settings
  getSettings(): SiteSettings {
    this.init();
    return safeGet<SiteSettings>(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
  },

  updateSettings(settings: Partial<SiteSettings>): SiteSettings {
    this.init();
    const current = safeGet<SiteSettings>(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
    const updated = { ...current, ...settings };
    safeSet(STORAGE_KEYS.SETTINGS, updated);
    return updated;
  },

  // Admin Stats
  getAdminStats(): AdminStats {
    this.init();
    const posts = safeGet<Post[]>(STORAGE_KEYS.POSTS, INITIAL_POSTS);
    const comments = safeGet<Comment[]>(STORAGE_KEYS.COMMENTS, INITIAL_COMMENTS);
    const subs = safeGet<NewsletterSubscriber[]>(STORAGE_KEYS.SUBSCRIBERS, INITIAL_SUBSCRIBERS);

    return {
      totalPosts: posts.length,
      publishedPosts: posts.filter(p => p.status === 'published').length,
      draftPosts: posts.filter(p => p.status === 'draft').length,
      totalViews: posts.reduce((sum, p) => sum + p.views, 0),
      totalComments: comments.length,
      pendingComments: comments.filter(c => c.status === 'pending').length,
      totalSubscribers: subs.length,
    };
  },

  // Auth (Admin session)
  getCurrentUser(): User | null {
    return safeGet<User | null>(STORAGE_KEYS.AUTH, null);
  },

  login(_email: string, _password: string): { success: boolean; message: string; user?: User } {
    // BEZBEDNOSNO: lokalna/demo admin prijava je UKLONJENA.
    // Ranije je za hardkodovane admin email adrese prihvatala bilo koju lozinku
    // dužine >= 6, što je bio potpuni zaobilaz autentikacije na klijentu.
    // Autentikacija se sada vrši ISKLJUČIVO preko bezbednog servera (/api/auth/login).
    return {
      success: false,
      message: 'Lokalna prijava je onemogućena. Prijavite se preko bezbednog servera.',
    };
  },

  logout(): void {
    localStorage.removeItem(STORAGE_KEYS.AUTH);
  },

  // Database Management
  resetToDefault(): void {
    safeSet(STORAGE_KEYS.POSTS, INITIAL_POSTS);
    safeSet(STORAGE_KEYS.CATEGORIES, INITIAL_CATEGORIES);
    safeSet(STORAGE_KEYS.TAGS, INITIAL_TAGS);
    safeSet(STORAGE_KEYS.COMMENTS, INITIAL_COMMENTS);
    safeSet(STORAGE_KEYS.SUBSCRIBERS, INITIAL_SUBSCRIBERS);
    safeSet(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
    safeSet(STORAGE_KEYS.BOOKMARKS, []);
  },

  exportDatabase(): string {
    const backup = {
      posts: safeGet(STORAGE_KEYS.POSTS, INITIAL_POSTS),
      categories: safeGet(STORAGE_KEYS.CATEGORIES, INITIAL_CATEGORIES),
      tags: safeGet(STORAGE_KEYS.TAGS, INITIAL_TAGS),
      comments: safeGet(STORAGE_KEYS.COMMENTS, INITIAL_COMMENTS),
      subscribers: safeGet(STORAGE_KEYS.SUBSCRIBERS, INITIAL_SUBSCRIBERS),
      settings: safeGet(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS),
      exportedAt: new Date().toISOString(),
    };
    return JSON.stringify(backup, null, 2);
  },

  importDatabase(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      if (data.posts && Array.isArray(data.posts)) safeSet(STORAGE_KEYS.POSTS, data.posts);
      if (data.categories && Array.isArray(data.categories)) safeSet(STORAGE_KEYS.CATEGORIES, data.categories);
      if (data.tags && Array.isArray(data.tags)) safeSet(STORAGE_KEYS.TAGS, data.tags);
      if (data.comments && Array.isArray(data.comments)) safeSet(STORAGE_KEYS.COMMENTS, data.comments);
      if (data.subscribers && Array.isArray(data.subscribers)) safeSet(STORAGE_KEYS.SUBSCRIBERS, data.subscribers);
      if (data.settings) safeSet(STORAGE_KEYS.SETTINGS, data.settings);
      return true;
    } catch (e) {
      console.error('Failed to import database:', e);
      return false;
    }
  },

  // AI Assistant Drafting Engine (Faza 7 from specification)
  generateAIDraft(topic: string, tone: 'hype' | 'analytical' | 'breaking' = 'hype'): {
    title: string;
    slug: string;
    excerpt: string;
    content: string;
    category_id: number;
    tags: string[];
    cover_image: string;
  } {
    const cleanTopic = topic.trim() || 'Nova gaming najava';
    const slugBase = cleanTopic
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

    const curatedCovers = [
      'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?auto=format&fit=crop&w=1200&q=80',
    ];
    const randomCover = curatedCovers[Math.floor(Math.random() * curatedCovers.length)];

    let title = `${cleanTopic}: Sve što treba da znate`;
    let excerpt = `Najnovije informacije i detaljna analiza vezana za ${cleanTopic}. Otkrijte šta razvojni tim priprema za publiku.`;
    let toneHeading = 'Zvanična najava i prve reakcije zajednice';

    if (tone === 'breaking') {
      title = `BREAKING: ${cleanTopic} zvanično potvrđeno!`;
      excerpt = `Iznenadna vest potresla je gejming svet: ${cleanTopic} dobija ključna unapređenja ranije nego što se očekivalo.`;
      toneHeading = 'Ekskluzivni detalji i vanredna najava';
    } else if (tone === 'analytical') {
      title = `Dubinska tehnička analiza: Kako ${cleanTopic} menja industriju`;
      excerpt = `Istražujemo hardverske i softverske aspekte iza ${cleanTopic} i šta to znači za budućnost igara.`;
      toneHeading = 'Arhitektura, optimizacija i uticaj na ekosistem';
    }

    const content = `<h2>${toneHeading}</h2>
<p>Gaming industrija nastavlja da se razvija munjevitom brzinom, a tema <strong>${cleanTopic}</strong> privukla je ogromnu pažnju igrača i novinara širom sveta.</p>
<p>Prema prvim pouzdanim informacijama, tim je radio u tajnosti duže od dve godine kako bi osigurao da nova mehanika i vizuelna prezentacija zadovolje najviše standarde moderne AAA produkcije.</p>
<blockquote>"Ovo je tek početak novog poglavlja u našoj viziji interaktivne zabave i povezivanja igrača."</blockquote>
<h3>Šta donosi ova prekretnica?</h3>
<p>Kombinacija naprednog renderovanja, optimizovanog koda i neposredne podrške zajednice obezbeđuje besprekorno iskustvo:</p>
<ul>
<li><strong>Napredna fizika i grafika:</strong> Puna podrška za HDR, ultra-široke rezolucije i nisku latenciju kontrola.</li>
<li><strong>Duboki narativ:</strong> Kompleksni dijaloški sistemi i nelinearni tok priče.</li>
<li><strong>Optimizacija za sve platforme:</strong> Stabilnih 60+ frejmova u sekundi bez kompromisa na detaljima.</li>
</ul>
<p>Uredništvo Nexus Gaminga nastaviće da prati razvoj situacije i donosiće ažuriranja čim se pojave novi zvanični podaci.</p>`;

    return {
      title,
      slug: `${slugBase}-${Date.now().toString().slice(-4)}`,
      excerpt,
      content,
      category_id: 1,
      tags: ['Unreal Engine 5', 'RPG', 'Hardware'],
      cover_image: randomCover,
    };
  },

  // Content Reports Management
  getReports(): any[] {
    this.init();
    return safeGet<any[]>(STORAGE_KEYS.REPORTS, [
      {
        id: 'rep_1',
        targetType: 'thread',
        targetId: 'thr_1',
        targetTitle: 'Koji upscaling mod koristite i da li primećujete razliku u latenciji?',
        reason: 'Unmarked Spoilers',
        details: 'Navodi bitne elemente priče bez spoiler taga.',
        reporterName: 'CyberFanatic',
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        status: 'pending',
      },
    ]);
  },

  createReport(report: any): void {
    this.init();
    const reports = this.getReports();
    reports.unshift(report);
    safeSet(STORAGE_KEYS.REPORTS, reports);
  },

  updateReportStatus(id: string, status: 'pending' | 'resolved' | 'dismissed'): void {
    this.init();
    const reports = this.getReports();
    const updated = reports.map(r => (r.id === id ? { ...r, status } : r));
    safeSet(STORAGE_KEYS.REPORTS, updated);
  },

  deleteReport(id: string): void {
    this.init();
    const reports = this.getReports();
    const filtered = reports.filter(r => r.id !== id);
    safeSet(STORAGE_KEYS.REPORTS, filtered);
  },
};
