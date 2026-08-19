# Log Technique Reference

## When to Use
- Cannot reproduce error locally
- Need runtime data from user's environment
- Intermittent or timing-sensitive bugs
- Production-only issues

## Log Placement Strategy

### Entry/Exit Points
```javascript
console.log('[DEBUG:entry] functionName called with:', { arg1, arg2 });
// ... function body ...
console.log('[DEBUG:exit] functionName returning:', result);
```

### Decision Points
```javascript
console.log('[DEBUG:decision] condition check:', { value, threshold });
if (value > threshold) {
  console.log('[DEBUG:branch] took truthy path');
} else {
  console.log('[DEBUG:branch] took falsy path');
}
```

### Data Transformation
```javascript
console.log('[DEBUG:transform] before:', data);
const result = transform(data);
console.log('[DEBUG:transform] after:', result);
```

### Async Boundaries
```javascript
console.log('[DEBUG:async] starting fetch:', url);
const start = Date.now();
const result = await fetch(url);
console.log('[DEBUG:async] fetch completed in', Date.now() - start, 'ms');
```

## Security — NEVER Log
- Passwords or hashes
- API keys or tokens
- Session IDs
- PII (emails, phone numbers, addresses)
- Credit card numbers
- Authentication headers

## Cleanup
- ALL `[DEBUG:` logs MUST be removed after issue resolved
- Track every log added in a table for removal
- Verify with: `grep -r "\[DEBUG" src/`
- Sometimes multiple rounds needed — always track for removal
