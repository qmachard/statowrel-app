import { useState } from 'react';

import { AccessDeniedScreen } from './auth/AccessDeniedScreen';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { SignInScreen } from './auth/SignInScreen';
import { Button } from './components/Button';
import { QuestionModal } from './questions/QuestionModal';
import { QuestionsTable } from './questions/QuestionsTable';
import type { ModeratedQuestion } from './questions/data/useQuestions';

/** Closed, writing a new question, or editing an existing one — the modal's three states. */
type ModalState = { open: false } | { open: true; question: ModeratedQuestion | null };

const ModerationScreen = ({ authorId }: { authorId: string }) => {
  const { user, signOut } = useAuth();
  const [ modal, setModal ] = useState<ModalState>({ open: false });

  return (
    <>
      <header className="app-header">
        <div className="app-header__inner">
          <h1 className="app-title">StatOwrel</h1>
          <span className="spacer" />
          <span className="tagline">{user?.email}</span>
          <Button variant="ghost" small onClick={() => { void signOut(); }}>
            Déconnexion
          </Button>
        </div>
      </header>
      <main className="page">
        <div className="row row--between">
          <h2>Modération</h2>
          <Button onClick={() => setModal({ open: true, question: null })}>
            Ajouter une question
          </Button>
        </div>

        <QuestionsTable onEdit={(question) => setModal({ open: true, question })} />
      </main>

      {modal.open ? (
        <QuestionModal
          // Keyed by what it edits, so the form is built from the right
          // defaults rather than reset after mounting.
          key={modal.question?.id ?? 'new'}
          question={modal.question}
          authorId={authorId}
          onClose={() => setModal({ open: false })}
        />
      ) : null}
    </>
  );
};

const Router = () => {
  const { user, isAdmin, initializing } = useAuth();

  if (initializing) {
    return (
      <main className="page page--centered">
        <p className="empty">Chargement…</p>
      </main>
    );
  }

  if (user === null) {
    return <SignInScreen />;
  }

  // `null` is the claim still in flight, which `initializing` normally covers —
  // it can only be seen for the render right after an account switch.
  if (isAdmin !== true) {
    return isAdmin === null ? null : <AccessDeniedScreen />;
  }

  return <ModerationScreen authorId={user.uid} />;
};

export default function App() {
  return (
    <AuthProvider>
      <Router />
    </AuthProvider>
  );
}
