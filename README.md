# 💒 RSVP Mariage - Guide d'installation

## Ce que fait cet outil

✅ Formulaire de confirmation de présence  
✅ Choix Adulte / Enfant  
✅ Présence cérémonie + soirée  
✅ Menu : Classique / Végétarien / Sans porc  
✅ Allergies alimentaires  
✅ Accompagnants illimités  
✅ Tableau de bord admin  
✅ Export Excel  

---

## 🚀 ÉTAPE 4 : Intégrer à WordPress (2 min)

### Méthode 1 : Avec un lien (le plus simple)

Dans Elementor ou l'éditeur WordPress, ajoute simplement un **bouton** :
- Texte : "Confirmer ma présence"
- Lien : ton URL Vercel (`https://rsvp-mariage-xxx.vercel.app`)
- Ouvrir dans un nouvel onglet : Oui

### Méthode 2 : Intégré dans une page (iframe)

1. Crée une nouvelle page "Confirmation"
2. Ajoute un bloc **HTML personnalisé**
3. Colle ce code :

```html
<iframe 
  src="https://rsvp-mariage-xxx.vercel.app" 
  width="100%" 
  height="800px" 
  style="border: none; border-radius: 16px;"
></iframe>
```

4. Remplace `xxx` par ton vrai lien Vercel
5. Publie la page !

---

## 🔐 Accéder au tableau de bord admin

1. Va sur ton formulaire
2. Tout en bas, clique sur **Administration**
3. Mot de passe : `mariage2025`

Tu peux :
- Voir toutes les réponses
- Voir les statistiques (adultes, enfants, menus...)
- Exporter en Excel
- Supprimer des réponses

---

## ⚙️ Personnaliser le mot de passe admin

1. Dans GitHub, ouvre le fichier `app/page.jsx`
2. Cherche `mariage2025` (il apparaît 2 fois)
3. Remplace par ton mot de passe
4. Clique **Commit changes**
5. Vercel redéploie automatiquement (1 min)

---

## ❓ FAQ

### Les données sont stockées où ?
Dans le navigateur des visiteurs (localStorage). C'est simple mais ça veut dire que :
- Toi seul peux voir les réponses depuis TON navigateur
- Si tu vides le cache, les données sont perdues
- Exporte régulièrement en Excel pour sauvegarder !

### Comment avoir les données sur mon téléphone ?
Les données sont liées au navigateur. Pour tout centraliser :
1. Accède toujours à l'admin depuis le même appareil
2. Ou exporte en Excel régulièrement

### Je veux changer les couleurs / le texte ?
Modifie le fichier `app/page.jsx` dans GitHub. Les changements sont automatiquement déployés.

---

## 🆘 Besoin d'aide ?

Le déploiement sur Vercel est vraiment simple, mais si tu bloques :
1. Vérifie que tous les fichiers sont bien uploadés sur GitHub
2. Vérifie que Vercel a bien accès à ton repo
3. Regarde les logs d'erreur dans Vercel si le déploiement échoue

---

**Bon mariage ! 💕**
