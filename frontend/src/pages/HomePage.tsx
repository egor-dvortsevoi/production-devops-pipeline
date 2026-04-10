type Props = {
  email: string;
  role: string;
};

export default function HomePage({ email, role }: Props) {
  return (
    <section className="role-page">
      <h2>Welcome to the Health Portal</h2>
      <p>Signed in as {email}</p>
      <p>Current role: {role}</p>
      <p>Use the sidebar to navigate to your role workspace.</p>
    </section>
  );
}
