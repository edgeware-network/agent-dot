export default function Error({ statusCode }) {
  return (
    <div style={{ padding: "20px", textAlign: "center" }}>
      <h1>{statusCode ? `Error ${statusCode}` : "An error occurred"}</h1>
      <p>Something went wrong.</p>
    </div>
  );
}

Error.getInitialProps = ({ res, err }) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};
