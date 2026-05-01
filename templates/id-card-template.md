# JMS — Event ID

<<LOOKUP("CFG-1","AdminConfig","ConfigID","EventName")>>  

**Registration ID:** <<[RegistrationID]>>  
**Participant:** <<[PrimaryName]>>  
**Mobile:** <<[PrimaryMobile]>>  

**Venue:** <<LOOKUP("CFG-1","AdminConfig","ConfigID","Venue")>>  

---

## Registered members (official serial numbers)

<<Start: SELECT(FamilyMembers[MemberID], [RegistrationID] = [_THISROW].[RegistrationID])>>
**<<[SerialNo]>>.** <<[MemberName]>> · <<[Relation]>> · <<[Mobile]>> · <<[Profession]>> · <<[Designation]>>
<<End>>

---

## Verification QR data

<<[QRCodePayload]>>

<<LOOKUP("CFG-1","AdminConfig","ConfigID","InvitationFootnote")>>
