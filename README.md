## pine-source – script de récupération de données

## 1. Prérequis

- **Node.js** (version LTS), à installer depuis : `https://nodejs.org/`
- **Git**, à installer depuis : `https://git-scm.com/downloads`

Ces deux outils existent pour **Windows** et **macOS**.  
Il suffit de télécharger l’installeur correspondant à votre système, puis de cliquer sur **Suivant / Next** jusqu’à la fin.

Pour vérifier l'installation, depuis un terminal :
```bash
node -v # doit afficher la version actuelle de nodejs
git -v # idem
```

## 2. Installation du projet

Dans un terminal :

```bash
cd wherever/you/want
git clone https://github.com/maximefabas/pine-source.git
cd pine-source/meteociel
npm install
```

## 3. Lancer le script

```bash
npm run update -- <url> <idFichierSortie>
```

- **`<url>`** : l’URL complète à partir de laquelle les données sont récupérées.
- **`<idFichierSortie>`** : le suffixe utilisé pour nommer le fichier JSON dans `output/`  
  (ex. `paris11` → `output/data.paris11.json`).
