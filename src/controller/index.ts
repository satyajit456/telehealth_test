import * as Fs from 'fs-extra';
import * as Path from 'path';
import { Express } from 'express';
// import users from './users';

const Routes = (app: Express): void => {
  const route =  Fs.readdirSync(__dirname)
    .filter((file: string) => file.indexOf('.') !== 0 && file !== 'index.ts') // Exclude non-relevant files
    .forEach(async (file: string) => {
      try {
        // Dynamically import the controller file
        var controller = require(Path.join(__dirname, file));

        // Convert file name to route name (without file extension)
        const name = file.replace(/\.[^/.]+$/, '');
        // Register the route in the app
        app.use(`/${name}`, controller.default || controller);
      } catch (error) {
        console.error(`Error loading controller for ${file}:`, error);
      }
    });
};

export default Routes;