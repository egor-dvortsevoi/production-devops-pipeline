import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export default function HomePage({ email, role }) {
    return (_jsxs("section", { className: "role-page", children: [_jsx("h2", { children: "Welcome to the Health Portal" }), _jsxs("p", { children: ["Signed in as ", email] }), _jsxs("p", { children: ["Current role: ", role] }), _jsx("p", { children: "Use the sidebar to navigate to your role workspace." })] }));
}
