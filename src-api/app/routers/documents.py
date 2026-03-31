from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import get_current_user
from app.schemas.documents import DocumentResponse
from app.services.document_service import (
    FileTooLarge,
    UnsupportedFileType,
    delete_document,
    get_document,
    list_documents,
    upload_document,
)

router = APIRouter(prefix="/api/documents", tags=["documents"])


@router.post("/", response_model=list[DocumentResponse], status_code=status.HTTP_201_CREATED)
async def upload_documents(
    request: Request,
    files: list[UploadFile],
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    results = []
    for file in files:
        try:
            doc = await upload_document(
                db=db,
                user_id=current_user["id"],
                file=file,
                arq_pool=getattr(request.app.state, "arq_pool", None),
            )
            results.append(doc)
        except UnsupportedFileType as e:
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail=str(e),
            )
        except FileTooLarge as e:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=str(e),
            )
    return results


@router.get("/", response_model=list[DocumentResponse])
async def list_all_documents(
    status_filter: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    return await list_documents(db, current_user["id"], status_filter)


@router.get("/{doc_id}", response_model=DocumentResponse)
async def get_single_document(
    doc_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    document = await get_document(db, current_user["id"], doc_id)
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    return document


@router.delete("/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_single_document(
    doc_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    deleted = await delete_document(db, current_user["id"], doc_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    return None
