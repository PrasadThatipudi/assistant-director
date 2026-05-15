/** Tell React 19 that `act` from react-test-renderer is allowed in this environment. */
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
