import '@testing-library/jest-dom';
import { Request, Response } from 'node-fetch';

Object.assign(global, { Request, Response });