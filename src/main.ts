import 'dotenv/config';
import express from 'express';
import path from 'path';
import { auth, requiresAuth } from 'express-openid-connect';
import { initDb, getStats, listPasses, getPass, cancelPass, deletePass } from './db';

const app = express();                          //express server
app.set('trust proxy', true);                   //koristenje rederovog proxy-a
app.set('view engine', 'pug');                  //koristenje pug-a
app.set('views', path.join(__dirname, 'views'));

const externalUrl = process.env.RENDER_EXTERNAL_URL;                                //koristenje porta kojeg render zada
const port = externalUrl && process.env.PORT ? parseInt(process.env.PORT) : 3000;
const baseURL = externalUrl || `http://localhost:${port}`;
const hostname = externalUrl ? '0.0.0.0' : '127.0.0.1';     //server slusa na 0.0.0.0
//inace lokalno server slusa na 127.0.0.1. na portu 3000

app.use(
  auth({
    authRequired: false,                            //stranica ne trazi prijevu (pocetna stranica je javna)
    auth0Logout: true,                              //koristenje authO-ovog nacina odjave
    baseURL,
    clientID: process.env.CLIENT_ID,                //podaci iz .env
    clientSecret: process.env.CLIENT_SECRET,
    issuerBaseURL: process.env.ISSUER_BASE_URL,
    secret: process.env.SECRET,
    authorizationParams: { response_type: 'code' },
  })
);

//pocetna stranica
app.get('/', async (req, res, next) => {
  try {
    const stats = await getStats();                                         //dva broja
    const loggedIn = req.oidc.isAuthenticated();                
    const passes = loggedIn ? await listPasses() : [];                      //ako je korisnik prijavljen prikazuje se i popis propusnica
    res.render('index', { stats, loggedIn, user: req.oidc.user, passes });  //slanje html-u
  } catch (e) {
    next(e);
  }
});

//javna info stranica (ID je zadnji dio putanje)
app.get('/info/:id', async (req, res, next) => {
  try {
    const pass = await getPass(String(req.params.id));              //dohvacanje propusnice preko id-a
    res.status(pass ? 200 : 404).render('info', { pass });  //ako propusnica postoji salje se status 200, inace 404
  } catch (e) {
    next(e);
  }
});

//zasticene akcije (samo prijavljeni korisnik, POST)
app.post('/admin/passes/:id/cancel', requiresAuth(), async (req, res, next) => {        //requiresAuth() - neprijavljenog korisnika preusmjeri na prijavu
  try {
    await cancelPass(String(req.params.id));
    res.redirect('/');                                                                  //nakon brisanja korisnika se vraca na pocetnu stranicu
  } catch (e) {
    next(e);
  }
});

app.post('/admin/passes/:id/delete', requiresAuth(), async (req, res, next) => {
  try {
    await deletePass(String(req.params.id));
    res.redirect('/');
  } catch (e) {
    next(e);
  }
});

//pokretanje servera, prvo se inicijalizira baza a tek onda server pocinje slusati
initDb()
  .then(() => {
    app.listen(port, hostname, () => {
      console.log(`Server locally running at ${baseURL}`);
      if (externalUrl) console.log(`External URL: ${externalUrl}`);
    });
  })
  .catch((e) => {
    console.error('Greška pri pokretanju baze:', e);
    process.exit(1);
  });