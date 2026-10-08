# My Social Networks

API REST de gestion de reseaux sociaux developpee avec Node.js, Express et MongoDB.

## Fonctionnalites

- Inscription et connexion des utilisateurs avec JWT
- Gestion des groupes publics, prives et secrets
- Creation et participation aux evenements
- Discussions et reponses aux messages
- Albums photo et commentaires
- Sondages et votes
- Billetterie avec limitation des stocks
- Protection contre les achats de billets en double

## Technologies

- Node.js
- Express.js
- MongoDB et Mongoose
- JWT
- bcrypt
- express-validator
- Helmet
- CORS
- express-rate-limit

## Installation

1. Cloner le depot GitHub.
2. Installer les dependances :

   npm install

3. Copier .env.example vers .env et renseigner les variables.
4. Creer les certificats HTTPS locaux dans certificates/.
5. Demarrer le serveur :

   node index.mjs

L'API est accessible sur https://localhost:3001.

## Principales routes

| Methode | Route | Description |
|---|---|---|
| POST | /users | Inscription |
| POST | /login | Connexion |
| GET | /users/me | Profil connecte |
| GET | /users | Liste des utilisateurs |
| POST | /groups | Creer un groupe |
| GET | /groups | Consulter les groupes accessibles |
| POST | /groups/:id/join | Rejoindre un groupe public |
| POST | /groups/:id/invite | Ajouter un membre |
| POST | /events | Creer un evenement |
| GET | /events | Consulter les evenements accessibles |
| POST | /events/:id/join | Rejoindre un evenement public |
| POST | /events/:id/invite | Ajouter un participant |
| GET | /discussions | Lister les discussions accessibles |
| GET | /discussions/:id | Consulter une discussion |
| POST | /discussions | Creer une discussion |
| POST | /discussions/:id/messages | Publier un message |
| POST | /discussions/:id/messages/:messageId/replies | Repondre |
| GET | /social-albums | Lister les albums accessibles |
| GET | /social-albums/:id | Consulter un album |
| POST | /social-albums | Creer un album |
| POST | /social-albums/:id/photos | Ajouter une photo |
| POST | /social-albums/:id/photos/:photoId/comments | Commenter |
| GET | /polls | Lister les sondages accessibles |
| GET | /polls/:id | Consulter un sondage |
| POST | /polls | Creer un sondage |
| POST | /polls/:id/vote | Voter |
| POST | /ticket-types | Creer un type de billet |
| POST | /tickets | Acheter un billet |
| GET | /ticket-types/:id/tickets | Consulter les achats (organisateur) |

## Authentification

Les routes protegees necessitent un token JWT :

Authorization: Bearer VOTRE_TOKEN

## Billetterie

- Un billet est associe a un evenement.
- Le stock est decremente lors de l'achat.
- Une adresse e-mail ne peut acheter qu'un billet par evenement.
- MongoDB utilise un index unique pour empecher les doublons.

## Securite

Les secrets, certificats et fichiers de test sont exclus du depot Git.

## Statut

Projet academique. Les principales fonctionnalites ont ete testees localement.

