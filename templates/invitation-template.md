# JMS Family Get Together — May 2026

Dear **<<[PrimaryName]>>** and family,

You are warmly invited by **<<LOOKUP("CFG-1","AdminConfig","ConfigID","HostName")>>** to join us at the **JMS Family Get Together**, **May 2026**.

**Venue:** <<LOOKUP("CFG-1","AdminConfig","ConfigID","Venue")>>  
**Theme:** Celebration, remembrance, and togetherness  

We celebrate this gathering with heartfelt joy—and we deeply value the honour of **your gracious presence**.

We are thrilled to extend this invitation specifically to:

<<Start: SELECT(FamilyMembers[MemberID], [RegistrationID] = [_THISROW].[RegistrationID])>>
- **Serial <<[SerialNo]>>.** <<[MemberName]>> (<<[Relation]>>)
<<End>>

With sincere warmth and anticipation of wonderful moments,

**Shri Ravi Malik**

---

<<LOOKUP("CFG-1","AdminConfig","ConfigID","InvitationFootnote")>>
