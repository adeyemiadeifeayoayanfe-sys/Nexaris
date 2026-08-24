import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

function portalPathForRole(role: string) {
  if (role === 'ADMIN') return '/admin';
  if (role === 'WORKER') return '/worker';
  return '/';
}

function portalLabelForRole(role: string) {
  if (role === 'ADMIN') return 'Open Admin Portal';
  if (role === 'WORKER') return 'Open Worker Portal';
  return 'Back to Website';
}

export function AuthPage() {
  const { session, profile, loading, error, signOut } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);

    if (!supabase) {
      setMessage('Supabase client is not configured.');
      setSubmitting(false);
      return;
    }

    try {
      if (mode === 'signin') {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

        if (signInError) {
          throw signInError;
        }

        setMessage('Sign-in successful.');
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName
            }
          }
        });

        if (signUpError) {
          throw signUpError;
        }

        setMessage(
          data.session
            ? 'Account created and signed in.'
            : 'Account created. Check your email if confirmation is required.'
        );
      }
    } catch (submitError) {
      setMessage(submitError instanceof Error ? submitError.message : 'Authentication failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="page">
      <section className="section two-column-layout">
        <div className="content-card">
          <p className="section-kicker">Authentication</p>
          <h1>Access the Nexaris platform securely.</h1>
          <p className="summary">
            Use the same sign-in form for admins and workers. Your portal is selected from the
            role saved on your Nexaris profile after authentication.
          </p>
          <div className="auth-role-grid">
            <article>
              <strong>Admin</strong>
              <p>Sign in with the owner/admin email and password, then open the admin portal.</p>
            </article>
            <article>
              <strong>Worker</strong>
              <p>Workers sign in with the account created after their application is approved.</p>
            </article>
          </div>
          {session && profile ? (
            <div className="success-panel">
              <strong>{profile.fullName}</strong>
              <p>
                Signed in as {profile.role} with status {profile.status}.
              </p>
              <div className="portal-links">
                <Link className="button button-secondary" to={portalPathForRole(profile.role)}>
                  {portalLabelForRole(profile.role)}
                </Link>
                <button className="button button-primary" onClick={() => void signOut()} type="button">
                  Sign Out
                </button>
              </div>
            </div>
          ) : (
            <div className="content-card nested-card">
              <h3>Current platform state</h3>
              <ul className="bullet-list">
                <li>Admin and worker roles are not selected on this form</li>
                <li>Role access is controlled by the backend profile record</li>
                <li>Only the owner admin can invite another admin</li>
              </ul>
            </div>
          )}
        </div>

        <form className="content-card form-card" onSubmit={handleSubmit}>
          <div className="tab-row">
            <button className={`tab-button ${mode === 'signin' ? 'tab-active' : ''}`} onClick={() => setMode('signin')} type="button">
              Sign In
            </button>
            <button className={`tab-button ${mode === 'signup' ? 'tab-active' : ''}`} onClick={() => setMode('signup')} type="button">
              Create Client Account
            </button>
          </div>
          {mode === 'signup' ? (
            <label>
              <span>Full Name</span>
              <input value={fullName} onChange={(event) => setFullName(event.target.value)} />
            </label>
          ) : null}
          <label>
            <span>Email</span>
            <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label>
            <span>Password</span>
            <input required minLength={8} type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          {loading ? <p className="form-note">Checking current session...</p> : null}
          {error ? <p className="form-error">{error}</p> : null}
          {message ? <p className="form-note">{message}</p> : null}
          <button className="button button-primary" disabled={submitting} type="submit">
            {submitting ? 'Submitting...' : mode === 'signin' ? 'Sign In' : 'Create Client Account'}
          </button>
          <p className="form-note">
            Admin and worker accounts are assigned by Nexaris. Do not create a public account if you
            are trying to access an admin or worker portal.
          </p>
        </form>
      </section>
    </main>
  );
}
