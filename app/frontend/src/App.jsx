import { HeartPulse } from 'lucide-react';
import { DashboardPage } from './pages/DashboardPage';

export default function App() {
  return (
    <div className="clinical-app">
      <a className="skip-link" href="#contenido">Ir al contenido</a>
      <header className="app-header">
        <div className="brand"><HeartPulse aria-hidden="true" size={26} /><span>NextGen <strong>Health</strong></span></div>
        <span className="header-context">Atención primaria <span aria-hidden="true">/</span> Revisión de analíticas</span>
      </header>
      <main id="contenido"><DashboardPage /></main>
      <footer className="app-footer">NextGen Health · Apoyo a la decisión clínica. La valoración final corresponde al profesional sanitario.</footer>
    </div>
  );
}
