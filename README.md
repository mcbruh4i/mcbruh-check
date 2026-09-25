# Aliakbar Asadinia — Portfolio

Personal portfolio of Aliakbar Asadinia (@mcbruh4i). Static HTML/CSS/JS, no build step.

## Features
- **Hero**: a canvas row of arched titanium columns with bottom-to-top gradients. When the mouse or a finger passes over a column, it keeps turning deeper blue, then slowly fades back to titanium.
- **Skills**: every skill is its own rigid body (Matter.js). They fall into one side under gravity, collide and stack realistically, and you can pick them up and throw them with a mouse or by touch. The "Drop again" button pours them in again.
- About, Projects and Contact sections, responsive down to mobile.
- `projects/northline/`: the earlier Northline Auto Cash lead-gen project (HTML/JS/PHP), linked as a demo.

## Structure
```
index.html              portfolio page
assets/portfolio.css    styles
assets/portfolio.js     hero canvas + skills physics
projects/northline/     Northline Auto Cash (PHP backend, needs config.php)
```

## Run locally
Any static server works, for example `npx http-server -p 3000 .`
